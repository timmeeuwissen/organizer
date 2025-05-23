import type { IntegrationAccount } from '~/types/models'
import type { CalendarEvent, CalendarPerson } from '~/stores/calendar'
import { refreshOAuthToken } from '~/utils/api/emailUtils'
import type { CalendarProvider, CalendarEventQuery, CalendarFetchResult } from './CalendarProvider'

/**
 * Google Calendar provider implementation
 */
export class GoogleCalendarProvider implements CalendarProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }
  
  isAuthenticated(): boolean {
    // console.log(`GoogleCalendarProvider.isAuthenticated check for ${this.account.oauthData.email}:`, {
    //   hasAccessToken: !!this.account.oauthData.accessToken,
    //   tokenExpiry: this.account.oauthData.tokenExpiry,
    //   currentTime: new Date(),
    //   isTokenExpired: this.account.oauthData.tokenExpiry ? new Date(this.account.oauthData.tokenExpiry) < new Date() : 'No expiry set',
    //   scope: this.account.oauthData.scope
    // })
    
    // Check access token
    if (!this.account.oauthData.accessToken) {
      console.log(`[GCal] ${this.account.oauthData.email}: No access token found`)
      return false
    }
    
    // Check token expiry
    // If tokenExpiry is not set, consider the token expired and force a refresh
    if (!this.account.oauthData.tokenExpiry) {
      console.log(`[GCal] ${this.account.oauthData.email}: No token expiry date set, assuming expired`)
      return false
    }
    
    // Check if token is expired
    if (new Date(this.account.oauthData.tokenExpiry) < new Date()) {
      console.log(`[GCal] ${this.account.oauthData.email}: Token expired`)
      return false
    }
    
    // Verify proper Calendar scopes if scope is specified
    if (this.account.oauthData.scope) {
      const hasCalendarScope = 
        this.account.oauthData.scope.includes('calendar') || 
        this.account.oauthData.scope.includes('calendar.readonly') || 
        this.account.oauthData.scope.includes('calendar.events') || 
        this.account.oauthData.scope.includes('calendar.events.readonly') ||
        this.account.oauthData.scope.includes('https://www.googleapis.com/auth/calendar');
        
      if (!hasCalendarScope) {
        console.warn(`[GCal] ${this.account.oauthData.email}: Google account missing required calendar scopes:`, this.account.oauthData.scope)
        return false
      }
    }
    
    console.log(`[GCal] ${this.account.oauthData.email}: Authentication valid`)
    return true
  }
  
  async authenticate(): Promise<boolean> {
    console.log(`[GCal] GoogleCalendarProvider.authenticate for ${this.account.oauthData.email}`)
    
    if (this.isAuthenticated()) {
      console.log(`[GCal] ${this.account.oauthData.email} is already authenticated`)
      return true
    }
    
    // Standard OAuth refresh flow for any account with a refresh token
    if (this.account.oauthData.refreshToken) {
      try {
        // Refresh token and get updated account
        const updatedAccount = await refreshOAuthToken(this.account);
        
        // Update this instance's account reference
        this.account = updatedAccount;
        
        // Update the account in the pinia store so other components can benefit
        // from the refreshed token without having to refresh again
        import('~/utils/api/emailUtils').then(module => {
          module.updateAccountInStore(updatedAccount);
        }).catch(err => {
          console.error('[GCal] Error importing updateAccountInStore:', err);
        });
        
        console.log(`[GCal] Successfully refreshed token for ${this.account.oauthData.email}`)
        return true
      } catch (error) {
        console.error(`[GCal] Failed to refresh token for ${this.account.oauthData.email}:`, error)
        return false
      }
    }
    
    console.warn(`[GCal] ${this.account.oauthData.email} has no refresh token, would need to redirect to OAuth flow`)
    return false
  }
  
  /**
   * Fetch calendar events with query support
   */
  async fetchEvents(query?: CalendarEventQuery): Promise<CalendarFetchResult> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GCal] Not authenticated with Google Calendar')
        return {
          events: [],
          hasMore: false
        }
      }
    }
    
    try {
      console.log('[GCal] requestiong to fetch from API with Query: ', query)
      // API endpoint for Google Calendar
      const endpoint = 'https://www.googleapis.com/calendar/v3/calendars'
      
      // Default to primary calendar if not specified
      const calendarId = query?.calendarId ? encodeURIComponent(query.calendarId) : 'primary'
      
      // Build query parameters for Google Calendar API
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime'
      })
      
      // Add date range to query
      if (query?.startDate) {
        params.append('timeMin', query.startDate.toISOString())
      } else {
        // Default to current date
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        params.append('timeMin', now.toISOString())
      }
      
      if (query?.endDate) {
        params.append('timeMax', query.endDate.toISOString())
      } else if (query?.startDate) {
        // Default to one month after start date
        const oneMonthLater = new Date(query.startDate)
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
        params.append('timeMax', oneMonthLater.toISOString())
      } else {
        // Default to one month from now
        const oneMonthLater = new Date()
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
        params.append('timeMax', oneMonthLater.toISOString())
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Make the request to get events
      const url = `${endpoint}/${calendarId}/events?${params.toString()}`
      console.log(`[GCal] Fetching events from: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })
      
      console.log('[GCal] Response object: ', response)

      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GCal] Fetch error:', errorText)
        throw new Error(`[GCal] API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Process events
      const events: CalendarEvent[] = []
      
      console.log('[GCal] Got API response:', data)

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          try {
            // Extract start and end times, handling all-day events
            let startTime: Date, endTime: Date
            let allDay = false
            
            if (item.start.date) {
              // All-day event
              startTime = new Date(item.start.date)
              endTime = new Date(item.end.date)
              // For all-day events, the end date is exclusive, so subtract one day
              endTime.setDate(endTime.getDate() - 1)
              allDay = true
            } else {
              // Timed event
              startTime = new Date(item.start.dateTime)
              endTime = new Date(item.end.dateTime)
              allDay = false
            }
            
            // Extract organizer
            const organizer: CalendarPerson | undefined = item.organizer ? {
              name: item.organizer.displayName || item.organizer.email,
              email: item.organizer.email
            } : undefined
            
            // Extract attendees
            const attendees: CalendarPerson[] = []
            
            if (item.attendees && Array.isArray(item.attendees)) {
              for (const attendee of item.attendees) {
                if (attendee.email) {
                  attendees.push({
                    name: attendee.displayName || attendee.email,
                    email: attendee.email
                  })
                }
              }
            }
            
            // Create event object
            const event: CalendarEvent = {
              id: item.id,
              title: item.summary || '(No title)',
              description: item.description,
              location: item.location,
              startTime,
              endTime,
              allDay,
              organizer,
              attendees: attendees.length > 0 ? attendees : undefined,
              calendarId: item.calendarId || calendarId,
              recurrence: item.recurrence ? item.recurrence.join(', ') : undefined
            }
            
            events.push(event)
          } catch (err) {
            console.error('[GCal] Error processing event:', err, item)
          }
        }
      }
      
      // Check if there are more events (pagination)
      const hasMore = !!data.nextPageToken
      
      console.log('[GCal] Returning with events:', events, hasMore)

      return {
        events,
        hasMore
      }
    } catch (error) {
      console.error('[GCal] Error fetching events:', error)
      return {
        events: [],
        hasMore: false
      }
    }
  }
  
  /**
   * Create a calendar event
   */
  async createEvent(event: CalendarEvent): Promise<{success: boolean, eventId?: string}> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GCal] Not authenticated with Google Calendar')
        return { success: false }
      }
    }
    
    try {
      // API endpoint for Google Calendar
      const endpoint = 'https://www.googleapis.com/calendar/v3/calendars'
      
      // Default to primary calendar if not specified
      const calendarId = event.calendarId ? encodeURIComponent(event.calendarId) : 'primary'
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Convert event to Google Calendar format
      const googleEvent: any = {
        summary: event.title,
        description: event.description || '',
        location: event.location || ''
      }
      
      // Handle start and end times
      if (event.allDay) {
        // All-day event
        const startDate = new Date(event.startTime)
        const endDate = new Date(event.endTime)
        // For all-day events, the end date is exclusive, so add one day
        endDate.setDate(endDate.getDate() + 1)
        
        googleEvent.start = {
          date: startDate.toISOString().split('T')[0]
        }
        googleEvent.end = {
          date: endDate.toISOString().split('T')[0]
        }
      } else {
        // Timed event
        googleEvent.start = {
          dateTime: new Date(event.startTime).toISOString()
        }
        googleEvent.end = {
          dateTime: new Date(event.endTime).toISOString()
        }
      }
      
      // Add attendees if present
      if (event.attendees && event.attendees.length > 0) {
        googleEvent.attendees = event.attendees.map(attendee => ({
          email: attendee.email,
          displayName: attendee.name
        }))
      }
      
      // Make the request to create the event
      const url = `${endpoint}/${calendarId}/events`
      console.log(`[GCal] Creating event at: ${url}`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(googleEvent)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GCal] Create error:', errorText)
        throw new Error(`[GCal] API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Return the success status and the event ID
      return {
        success: true,
        eventId: data.id
      }
    } catch (error) {
      console.error('[GCal] Error creating event:', error)
      return { success: false }
    }
  }
  
  /**
   * Update a calendar event
   */
  async updateEvent(event: CalendarEvent): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GCal] Not authenticated with Google Calendar')
        return false
      }
    }
    
    try {
      // API endpoint for Google Calendar
      const endpoint = 'https://www.googleapis.com/calendar/v3/calendars'
      
      // Default to primary calendar if not specified
      const calendarId = event.calendarId ? encodeURIComponent(event.calendarId) : 'primary'
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Convert event to Google Calendar format
      const googleEvent: any = {
        summary: event.title,
        description: event.description || '',
        location: event.location || ''
      }
      
      // Handle start and end times
      if (event.allDay) {
        // All-day event
        const startDate = new Date(event.startTime)
        const endDate = new Date(event.endTime)
        // For all-day events, the end date is exclusive, so add one day
        endDate.setDate(endDate.getDate() + 1)
        
        googleEvent.start = {
          date: startDate.toISOString().split('T')[0]
        }
        googleEvent.end = {
          date: endDate.toISOString().split('T')[0]
        }
      } else {
        // Timed event
        googleEvent.start = {
          dateTime: new Date(event.startTime).toISOString()
        }
        googleEvent.end = {
          dateTime: new Date(event.endTime).toISOString()
        }
      }
      
      // Add attendees if present
      if (event.attendees && event.attendees.length > 0) {
        googleEvent.attendees = event.attendees.map(attendee => ({
          email: attendee.email,
          displayName: attendee.name
        }))
      }
      
      // Make the request to update the event
      const url = `${endpoint}/${calendarId}/events/${event.id}`
      console.log(`[GCal] Updating event at: ${url}`)
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(googleEvent)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GCal] Update error:', errorText)
        throw new Error(`[GCal] API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[GCal] Error updating event:', error)
      return false
    }
  }
  
  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GCal] Not authenticated with Google Calendar')
        return false
      }
    }
    
    try {
      // API endpoint for Google Calendar
      const endpoint = 'https://www.googleapis.com/calendar/v3/calendars'
      
      // Default to primary calendar for deletion
      // Note: In a real implementation, we would need to know which calendar the event belongs to
      const calendarId = 'primary'
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      // Make the request to delete the event
      const url = `${endpoint}/${calendarId}/events/${eventId}`
      console.log(`[GCal] Deleting event at: ${url}`)
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GCal] Delete error:', errorText)
        throw new Error(`[GCal] API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[GCal] Error deleting event:', error)
      return false
    }
  }
  
  /**
   * Get available calendars
   */
  async getCalendars(): Promise<{id: string, name: string, primary: boolean}[]> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GCal] Not authenticated with Google Calendar')
        return []
      }
    }
    
    try {
      // API endpoint for Google Calendar
      const endpoint = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      // Make the request to get the calendar list
      console.log(`[GCal] Fetching calendar list`)
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GCal] Calendar list error:', errorText)
        throw new Error(`[GCal] API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract calendars
      const calendars: {id: string, name: string, primary: boolean}[] = []
      
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.id && item.summary) {
            calendars.push({
              id: item.id,
              name: item.summary,
              primary: !!item.primary
            })
          }
        }
      }
      
      return calendars
    } catch (error) {
      console.error('[GCal] Error fetching calendars:', error)
      return []
    }
  }
}
