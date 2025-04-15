import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { IntegrationAccount } from '~/types/models'
import { hasValidOAuthTokens, refreshOAuthToken } from '~/utils/api/emailUtils'
import { getCalendarProvider } from '~/utils/api/calendarProviders/index'
import type { CalendarEventQuery, CalendarProvider } from '~/utils/api/calendarProviders/CalendarProvider'

// Calendar types
export interface CalendarPerson {
  name: string
  email: string
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  allDay: boolean
  organizer?: CalendarPerson
  attendees?: CalendarPerson[]
  calendarId?: string
  accountId?: string
  recurrence?: string
  type?: string // 'meeting', 'task', etc.
}

export interface Calendar {
  id: string
  name: string
  primary: boolean
  color?: string
  accountId?: string
}

export const useCalendarStore = defineStore('calendar', {
  state: () => ({
    events: [] as CalendarEvent[],
    calendars: [] as Calendar[],
    loading: false,
    error: null as string | null,
    // Query state
    currentStartDate: new Date(),
    currentEndDate: new Date(),
    currentQuery: null as CalendarEventQuery | null,
    // Additional state
    hasMore: false,
    loadingCalendars: false,
  }),

  getters: {
    getEventsForDay: (state) => (date: Date) => {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      return state.events.filter(event => {
        const eventStart = new Date(event.startTime)
        // For all day events, just check the date
        if (event.allDay) {
          return eventStart.getFullYear() === date.getFullYear() &&
                 eventStart.getMonth() === date.getMonth() &&
                 eventStart.getDate() === date.getDate()
        }
        
        // For timed events, check if they fall within the day
        return eventStart >= dayStart && eventStart <= dayEnd
      })
    },
    
    getEventsForRange: (state) => (startDate: Date, endDate: Date) => {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      
      return state.events.filter(event => {
        const eventStart = new Date(event.startTime)
        const eventEnd = new Date(event.endTime)
        
        // Check if the event overlaps with the date range
        return (eventStart >= start && eventStart <= end) || 
               (eventEnd >= start && eventEnd <= end) ||
               (eventStart <= start && eventEnd >= end)
      })
    },
    
    getConnectedAccounts: () => {
      const authStore = useAuthStore()
      const integrationAccounts = authStore.currentUser?.settings?.integrationAccounts || []
      
      // Only return accounts that are connected and have syncCalendar and showInCalendar set to true
      return integrationAccounts.filter(account => 
        account.oauthData.connected && account.syncCalendar && account.showInCalendar
      )
    }
  },

  actions: {
    /**
     * Fetch calendar events for the specified date range
     */
    async fetchEvents(query?: CalendarEventQuery) {
      this.loading = true
      this.error = null
      
      try {
        // Get connected accounts from auth store
        const connectedAccounts = this.getConnectedAccounts
        
        // If no connected accounts, return empty array
        if (connectedAccounts.length === 0) {
          this.loading = false
          this.events = []
          return
        }
        
        // Store current query parameters
        this.currentQuery = query || { 
          startDate: this.currentStartDate, 
          endDate: this.currentEndDate 
        }
        
        // Set date range parameters if provided
        if (query?.startDate) this.currentStartDate = query.startDate
        if (query?.endDate) this.currentEndDate = query.endDate
        
        // Clear existing events when fetching a new query
        this.events = []
        
        // Fetch events from each connected account
        let allEvents: CalendarEvent[] = []
        let anyHasMore = false
        
        for (const account of connectedAccounts) {
          try {
            console.log(`[Calendar] Fetching events for account ${account.oauthData.email}`)
            const result = await this.fetchEventsFromAccount(account, query)
            console.log(`[Calendar] Received ${result.events.length} events for account ${account.oauthData.email}`)
            allEvents.push(...result.events)
            if (result.hasMore) {
              anyHasMore = true
            }
          } catch (error) {
            console.error(`[Calendar] Error fetching events for account ${account.oauthData.email}:`, error)
          }
        }
        
        // Replace the events array with the new results
        this.events = allEvents
        console.log(`[Calendar] Total events in state after fetching: ${this.events.length}`)
        console.log('[Calendar] Internal state is ', this.events)

        // Sort events by start time
        this.events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        
        // Update pagination state
        this.hasMore = anyHasMore
      } catch (error: any) {
        console.error('[Calendar] Error fetching calendar events:', error)
        this.error = error.message || '[Calendar] Failed to fetch calendar events'
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Fetch events from a specific account
     */
    async fetchEventsFromAccount(
      account: IntegrationAccount, 
      query?: CalendarEventQuery
    ) {
      try {
        console.log(`[Calendar] Connecting to ${account.type} calendar API for account: ${account.oauthData.email}`)
        
        // Create a copy of the account object to avoid modifying the original
        let workingAccount = { ...account }
        
        // Get the appropriate calendar provider
        const calendarProvider = getCalendarProvider(workingAccount)
        
        // Check if authenticated
        if (!calendarProvider.isAuthenticated()) {
          console.log(`[Calendar] Account ${account.oauthData.email} requires authentication`)
          
          // Try to authenticate
          const authenticated = await calendarProvider.authenticate()
          if (!authenticated) {
            console.warn(`[Calendar] Authentication failed for account ${account.oauthData.email}`)
            
            // Log failure for the UI to handle
            this.error = `[Calendar] Authentication failed for ${account.oauthData.email}. Check token permissions or try reconnecting the account.`
            return { events: [], hasMore: false }
          }
          else console.info(`[Calendar] Authentication succeeded for account ${account.oauthData.email}`)
        }
        
        // Use the query if provided, otherwise default to current date range
        const eventQuery = query || { 
          startDate: this.currentStartDate, 
          endDate: this.currentEndDate 
        }
        
        // Fetch events
        try {
          console.log(`[Calendar] Fetching events for ${account.oauthData.email} with query:`, eventQuery)
          const result = await calendarProvider.fetchEvents(eventQuery)
          
          // Add account ID to each event
          const eventsWithAccount = result.events.map(event => ({
            ...event,
            accountId: account.id
          }))
          
          return { events: eventsWithAccount, hasMore: result.hasMore }
        } catch (error: any) {
          console.error(`[Calendar] Error fetching events for ${account.oauthData.email}:`, error)
          return { events: [], hasMore: false }
        }
      } catch (error) {
        console.error(`[Calendar] Error fetching events for account ${account.oauthData.email}:`, error)
        throw error
      }
    },
    
    /**
     * Fetch available calendars from all connected accounts
     */
    async fetchCalendars() {
      this.loadingCalendars = true
      
      try {
        // Get connected accounts from auth store
        const connectedAccounts = this.getConnectedAccounts
        
        // If no connected accounts, return empty array
        if (connectedAccounts.length === 0) {
          this.loadingCalendars = false
          this.calendars = []
          return
        }
        
        // Clear existing calendars
        this.calendars = []
        
        // Fetch calendars from each connected account
        for (const account of connectedAccounts) {
          try {
            const calendarProvider = getCalendarProvider(account)
            
            // Check if authenticated
            if (!calendarProvider.isAuthenticated()) {
              const authenticated = await calendarProvider.authenticate()
              if (!authenticated) continue
            }
            
            // Fetch calendars
            const calendars = await calendarProvider.getCalendars()
            
            // Add account ID to each calendar
            const calendarsWithAccount = calendars.map(calendar => ({
              ...calendar,
              accountId: account.id
            }))
            
            // Add to store
            this.calendars = [...this.calendars, ...calendarsWithAccount]
          } catch (error) {
            console.error(`[Calendar] Error fetching calendars for ${account.oauthData.email}:`, error)
          }
        }
      } catch (error: any) {
        console.error('[Calendar] Error fetching calendars:', error)
      } finally {
        this.loadingCalendars = false
      }
    },
    
    /**
     * Create a new calendar event
     */
    async createEvent(event: CalendarEvent) {
      try {
        // Get the account to use
        const connectedAccounts = this.getConnectedAccounts
        if (connectedAccounts.length === 0) {
          console.error('[Calendar] No connected accounts to create event in')
          return { success: false }
        }
        
        // If account ID is specified and exists, use that
        let account
        if (event.accountId) {
          account = connectedAccounts.find(a => a.id === event.accountId)
        }
        
        // Otherwise use the first connected account
        if (!account) {
          account = connectedAccounts[0]
        }
        
        const calendarProvider = getCalendarProvider(account)
        
        // Check if authenticated
        if (!calendarProvider.isAuthenticated()) {
          const authenticated = await calendarProvider.authenticate()
          if (!authenticated) {
            console.error('[Calendar] Not authenticated with calendar provider')
            return { success: false }
          }
        }
        
        // Create the event
        const result = await calendarProvider.createEvent(event)
        
        if (result.success && result.eventId) {
          // Add to local state
          this.events.push({
            ...event,
            id: result.eventId,
            accountId: account.id
          })
        }
        
        return result
      } catch (error) {
        console.error('[Calendar] Error creating event:', error)
        return { success: false }
      }
    },
    
    /**
     * Update an existing calendar event
     */
    async updateEvent(event: CalendarEvent) {
      try {
        if (!event.accountId) {
          console.error('[Calendar] No account ID specified for event update')
          return false
        }
        
        // Get the account to use
        const connectedAccounts = this.getConnectedAccounts
        const account = connectedAccounts.find(a => a.id === event.accountId)
        
        if (!account) {
          console.error(`[Calendar] Account with ID ${event.accountId} not found`)
          return false
        }
        
        const calendarProvider = getCalendarProvider(account)
        
        // Check if authenticated
        if (!calendarProvider.isAuthenticated()) {
          const authenticated = await calendarProvider.authenticate()
          if (!authenticated) {
            console.error('[Calendar] Not authenticated with calendar provider')
            return false
          }
        }
        
        // Update the event
        const success = await calendarProvider.updateEvent(event)
        
        if (success) {
          // Update local state
          const index = this.events.findIndex(e => e.id === event.id)
          if (index !== -1) {
            this.events[index] = { ...event }
          }
        }
        
        return success
      } catch (error) {
        console.error('[Calendar] Error updating event:', error)
        return false
      }
    },
    
    /**
     * Delete a calendar event
     */
    async deleteEvent(eventId: string) {
      try {
        // Find the event in local state
        const event = this.events.find(e => e.id === eventId)
        
        if (!event || !event.accountId) {
          console.error('[Calendar] Event not found or missing account ID')
          return false
        }
        
        // Get the account to use
        const connectedAccounts = this.getConnectedAccounts
        const account = connectedAccounts.find(a => a.id === event.accountId)
        
        if (!account) {
          console.error(`[Calendar] Account with ID ${event.accountId} not found`)
          return false
        }
        
        const calendarProvider = getCalendarProvider(account)
        
        // Check if authenticated
        if (!calendarProvider.isAuthenticated()) {
          const authenticated = await calendarProvider.authenticate()
          if (!authenticated) {
            console.error('[Calendar] Not authenticated with calendar provider')
            return false
          }
        }
        
        // Delete the event
        const success = await calendarProvider.deleteEvent(eventId)
        
        if (success) {
          // Remove from local state
          this.events = this.events.filter(e => e.id !== eventId)
        }
        
        return success
      } catch (error) {
        console.error('[Calendar] Error deleting event:', error)
        return false
      }
    }
  }
})
