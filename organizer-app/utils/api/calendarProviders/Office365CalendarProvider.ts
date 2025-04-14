import type { IntegrationAccount } from '~/types/models'
import type { CalendarEvent, CalendarPerson } from '~/stores/calendar'
import { refreshOAuthToken } from '~/utils/api/emailUtils'
import type { CalendarProvider, CalendarEventQuery, CalendarFetchResult } from './CalendarProvider'

/**
 * Office 365 Calendar provider implementation
 */
export class Office365CalendarProvider implements CalendarProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }
  
  isAuthenticated(): boolean {
    console.log(`Office365CalendarProvider.isAuthenticated check for ${this.account.email}:`, {
      hasAccessToken: !!this.account.accessToken,
      tokenExpiry: this.account.tokenExpiry,
      currentTime: new Date(),
      isTokenExpired: this.account.tokenExpiry ? new Date(this.account.tokenExpiry) < new Date() : 'No expiry set',
      scope: this.account.scope
    });
    
    // Check access token
    if (!this.account.accessToken) {
      console.log(`${this.account.email}: No access token found`);
      return false;
    }
    
    // Check token expiry
    // If tokenExpiry is not set, consider the token expired and force a refresh
    if (!this.account.tokenExpiry) {
      console.log(`${this.account.email}: No token expiry date set, assuming expired`);
      return false;
    }
    
    // Check if token is expired
    if (new Date(this.account.tokenExpiry) < new Date()) {
      console.log(`${this.account.email}: Token expired`);
      return false;
    }
    
    console.log(`${this.account.email}: Authentication valid`);
    return true;
  }
  
  async authenticate(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true
    }
    
    if (this.account.refreshToken) {
      try {
        this.account = await refreshOAuthToken(this.account)
        return true
      } catch (error) {
        console.error('Failed to refresh Office 365 token:', error)
        return false
      }
    }
    
    // Would need to redirect user to OAuth flow
    return false
  }
  
  /**
   * Fetch calendar events with query support
   */
  async fetchEvents(query?: CalendarEventQuery): Promise<CalendarFetchResult> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Office 365')
        return {
          events: [],
          hasMore: false
        }
      }
    }
    
    try {
      // API endpoint for Microsoft Graph
      const calendarId = query?.calendarId || ''
      
      // Use different endpoints based on whether a specific calendar ID is provided
      let endpoint: string
      if (calendarId) {
        endpoint = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`
      } else {
        endpoint = 'https://graph.microsoft.com/v1.0/me/events'
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        '$select': 'id,subject,bodyPreview,organizer,attendees,start,end,location,isAllDay',
        '$orderby': 'start/dateTime asc',
        '$top': '50' // Limit to 50 events per request
      })
      
      // Add date range to query
      if (query?.startDate || query?.endDate) {
        let filterString = ''
        
        if (query?.startDate) {
          const startDate = new Date(query.startDate).toISOString()
          filterString += `start/dateTime ge '${startDate}'`
        }
        
        if (query?.startDate && query?.endDate) {
          filterString += ' and '
        }
        
        if (query?.endDate) {
          const endDate = new Date(query.endDate).toISOString()
          filterString += `end/dateTime le '${endDate}'`
        }
        
        params.append('$filter', filterString)
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'outlook.timezone="UTC"'
      }
      
      // Make the request
      const url = `${endpoint}?${params.toString()}`
      console.log(`[Office 365] Fetching events from: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Office 365] Fetch error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Process events
      const events: CalendarEvent[] = []
      
      if (data.value && Array.isArray(data.value)) {
        for (const item of data.value) {
          try {
            // Extract start and end times
            let startTime: Date, endTime: Date
            let allDay = !!item.isAllDay
            
            if (allDay) {
              // All-day event
              startTime = new Date(item.start.dateTime + 'Z') // Ensure UTC
              endTime = new Date(item.end.dateTime + 'Z') // Ensure UTC
              // For all-day events, the end date is exclusive, so subtract one day
              endTime.setDate(endTime.getDate() - 1)
            } else {
              // Timed event
              startTime = new Date(item.start.dateTime + 'Z') // Ensure UTC
              endTime = new Date(item.end.dateTime + 'Z') // Ensure UTC
            }
            
            // Extract organizer
            const organizer: CalendarPerson | undefined = item.organizer?.emailAddress ? {
              name: item.organizer.emailAddress.name,
              email: item.organizer.emailAddress.address
            } : undefined
            
            // Extract attendees
            const attendees: CalendarPerson[] = []
            
            if (item.attendees && Array.isArray(item.attendees)) {
              for (const attendee of item.attendees) {
                if (attendee.emailAddress) {
                  attendees.push({
                    name: attendee.emailAddress.name || attendee.emailAddress.address,
                    email: attendee.emailAddress.address
                  })
                }
              }
            }
            
            // Extract location
            let location = undefined
            if (item.location && item.location.displayName) {
              location = item.location.displayName
            }
            
            // Create event object
            const event: CalendarEvent = {
              id: item.id,
              title: item.subject || '(No title)',
              description: item.bodyPreview,
              location,
              startTime,
              endTime,
              allDay,
              organizer,
              attendees: attendees.length > 0 ? attendees : undefined,
              calendarId: query?.calendarId
            }
            
            events.push(event)
          } catch (err) {
            console.error('[Office 365] Error processing event:', err, item)
          }
        }
      }
      
      // Check if there are more events (pagination)
      const hasMore = !!data['@odata.nextLink']
      
      return {
        events,
        hasMore
      }
    } catch (error) {
      console.error('[Office 365] Error fetching events:', error)
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
        console.error('Not authenticated with Office 365')
        return { success: false }
      }
    }
    
    try {
      // API endpoint for Microsoft Graph
      const calendarId = event.calendarId || ''
      
      // Use different endpoints based on whether a specific calendar ID is provided
      let endpoint: string
      if (calendarId) {
        endpoint = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`
      } else {
        endpoint = 'https://graph.microsoft.com/v1.0/me/events'
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Convert event to Microsoft Graph format
      const graphEvent: any = {
        subject: event.title,
        bodyPreview: event.description || '',
        isAllDay: event.allDay
      }
      
      // Handle location if provided
      if (event.location) {
        graphEvent.location = {
          displayName: event.location
        }
      }
      
      // Handle start and end times
      if (event.allDay) {
        // All-day event
        const startDate = new Date(event.startTime)
        const endDate = new Date(event.endTime)
        // For all-day events, the end date is exclusive, so add one day
        endDate.setDate(endDate.getDate() + 1)
        
        graphEvent.start = {
          dateTime: startDate.toISOString().split('T')[0] + 'T00:00:00',
          timeZone: 'UTC'
        }
        graphEvent.end = {
          dateTime: endDate.toISOString().split('T')[0] + 'T00:00:00',
          timeZone: 'UTC'
        }
      } else {
        // Timed event
        graphEvent.start = {
          dateTime: new Date(event.startTime).toISOString().replace('Z', ''),
          timeZone: 'UTC'
        }
        graphEvent.end = {
          dateTime: new Date(event.endTime).toISOString().replace('Z', ''),
          timeZone: 'UTC'
        }
      }
      
      // Add attendees if present
      if (event.attendees && event.attendees.length > 0) {
        graphEvent.attendees = event.attendees.map(attendee => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name
          },
          type: 'required'
        }))
      }
      
      // Make the request
      console.log(`[Office 365] Creating event at: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(graphEvent)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Office 365] Create error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Return the success status and the event ID
      return {
        success: true,
        eventId: data.id
      }
    } catch (error) {
      console.error('[Office 365] Error creating event:', error)
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
        console.error('Not authenticated with Office 365')
        return false
      }
    }
    
    try {
      // API endpoint for Microsoft Graph
      const endpoint = `https://graph.microsoft.com/v1.0/me/events/${event.id}`
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Convert event to Microsoft Graph format
      const graphEvent: any = {
        subject: event.title,
        bodyPreview: event.description || '',
        isAllDay: event.allDay
      }
      
      // Handle location if provided
      if (event.location) {
        graphEvent.location = {
          displayName: event.location
        }
      }
      
      // Handle start and end times
      if (event.allDay) {
        // All-day event
        const startDate = new Date(event.startTime)
        const endDate = new Date(event.endTime)
        // For all-day events, the end date is exclusive, so add one day
        endDate.setDate(endDate.getDate() + 1)
        
        graphEvent.start = {
          dateTime: startDate.toISOString().split('T')[0] + 'T00:00:00',
          timeZone: 'UTC'
        }
        graphEvent.end = {
          dateTime: endDate.toISOString().split('T')[0] + 'T00:00:00',
          timeZone: 'UTC'
        }
      } else {
        // Timed event
        graphEvent.start = {
          dateTime: new Date(event.startTime).toISOString().replace('Z', ''),
          timeZone: 'UTC'
        }
        graphEvent.end = {
          dateTime: new Date(event.endTime).toISOString().replace('Z', ''),
          timeZone: 'UTC'
        }
      }
      
      // Add attendees if present
      if (event.attendees && event.attendees.length > 0) {
        graphEvent.attendees = event.attendees.map(attendee => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name
          },
          type: 'required'
        }))
      }
      
      // Make the request
      console.log(`[Office 365] Updating event at: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(graphEvent)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Office 365] Update error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[Office 365] Error updating event:', error)
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
        console.error('Not authenticated with Office 365')
        return false
      }
    }
    
    try {
      // API endpoint for Microsoft Graph
      const endpoint = `https://graph.microsoft.com/v1.0/me/events/${eventId}`
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Accept': 'application/json'
      }
      
      // Make the request
      console.log(`[Office 365] Deleting event at: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Office 365] Delete error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[Office 365] Error deleting event:', error)
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
        console.error('Not authenticated with Office 365')
        return []
      }
    }
    
    try {
      // API endpoint for Microsoft Graph
      const endpoint = 'https://graph.microsoft.com/v1.0/me/calendars'
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Accept': 'application/json'
      }
      
      // Make the request
      console.log(`[Office 365] Fetching calendar list`)
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Office 365] Calendar list error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract calendars
      const calendars: {id: string, name: string, primary: boolean}[] = []
      
      if (data.value && Array.isArray(data.value)) {
        for (const item of data.value) {
          if (item.id && item.name) {
            calendars.push({
              id: item.id,
              name: item.name,
              primary: item.isDefaultCalendar || false
            })
          }
        }
      }
      
      return calendars
    } catch (error) {
      console.error('[Office 365] Error fetching calendars:', error)
      return []
    }
  }
}
