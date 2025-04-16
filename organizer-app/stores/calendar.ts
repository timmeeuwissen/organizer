import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
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
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  organizer?: CalendarPerson;
  attendees?: CalendarPerson[];
  calendarId?: string;
  accountId?: string;
  recurrence?: string;
  type?: string; // 'meeting', 'task', etc.
  meetingId?: string; // Reference to a meeting
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Calendar {
  id: string
  name: string
  primary: boolean
  color?: string
  accountId?: string
}

export const useCalendarStore = defineStore({
  id: 'calendar',
  
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
    // Local persistence state
    syncedEvents: [] as CalendarEvent[], // Events stored in Firestore
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
     * Fetch local persisted events from Firestore
     */
    async fetchPersistedEvents() {
      const authStore = useAuthStore()
      if (!authStore.user) return []
      
      try {
        const db = getFirestore()
        const eventsRef = collection(db, 'calendarEvents')
        const q = query(
          eventsRef, 
          where('userId', '==', authStore.user.id),
          orderBy('startTime')
        )
        const querySnapshot = await getDocs(q)
        
        const events = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as unknown as CalendarEvent
        })
        
        this.syncedEvents = events
        console.log(`[Calendar] Loaded ${events.length} persisted events from Firestore`)
        return events
      } catch (error: any) {
        console.error('[Calendar] Error fetching persisted events:', error)
        return []
      }
    },
    
    /**
     * Save an event to Firestore
     */
    async persistEvent(event: CalendarEvent) {
      const authStore = useAuthStore()
      if (!authStore.user) return null
      
      try {
        const db = getFirestore()
        const eventsRef = collection(db, 'calendarEvents')
        
        const eventData = {
          ...event,
          userId: authStore.user.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Convert Date objects to Firestore timestamps
          startTime: event.startTime,
          endTime: event.endTime,
        }
        
        // Create a new object without the id
        const { id, ...eventDataWithoutId } = eventData
        
        const docRef = await addDoc(eventsRef, eventDataWithoutId)
        console.log(`[Calendar] Event persisted with ID: ${docRef.id}`)
        
        // Add this event to our synced events list
        const newEvent = {
          ...eventData,
          id: docRef.id,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as CalendarEvent
        
        this.syncedEvents.push(newEvent)
        
        return docRef.id
      } catch (error: any) {
        console.error('[Calendar] Error persisting event:', error)
        return null
      }
    },
    
    /**
     * Update a persisted event in Firestore
     */
    async updatePersistedEvent(id: string, updates: Partial<CalendarEvent>) {
      const authStore = useAuthStore()
      if (!authStore.user) return false
      
      try {
        const db = getFirestore()
        const eventRef = doc(db, 'calendarEvents', id)
        
        // First, verify this event belongs to the current user
        const eventSnap = await getDoc(eventRef)
        if (!eventSnap.exists()) {
          console.error('[Calendar] Event not found for update:', id)
          return false
        }
        
        const eventData = eventSnap.data()
        if (eventData.userId !== authStore.user.id) {
          console.error('[Calendar] Unauthorized access to event:', id)
          return false
        }
        
        // Prepare update data
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp(),
        }
        
        // Convert Date objects
        if (updates.startTime) updateData.startTime = updates.startTime
        if (updates.endTime) updateData.endTime = updates.endTime
        
        // Don't update these fields
        const { id: _, userId, createdAt, ...updateDataWithoutId } = updateData as any
        
        await updateDoc(eventRef, updateDataWithoutId)
        console.log(`[Calendar] Event updated in Firestore: ${id}`)
        
        // Update in local state
        const index = this.syncedEvents.findIndex(e => e.id === id)
        if (index !== -1) {
          this.syncedEvents[index] = {
            ...this.syncedEvents[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        return true
      } catch (error: any) {
        console.error('[Calendar] Error updating persisted event:', error)
        return false
      }
    },
    
    /**
     * Delete a persisted event from Firestore
     */
    async deletePersistedEvent(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return false
      
      try {
        const db = getFirestore()
        const eventRef = doc(db, 'calendarEvents', id)
        
        // First, verify this event belongs to the current user
        const eventSnap = await getDoc(eventRef)
        if (!eventSnap.exists()) {
          console.error('[Calendar] Event not found for deletion:', id)
          return false
        }
        
        const eventData = eventSnap.data()
        if (eventData.userId !== authStore.user.id) {
          console.error('[Calendar] Unauthorized access to event for deletion:', id)
          return false
        }
        
        await deleteDoc(eventRef)
        console.log(`[Calendar] Event deleted from Firestore: ${id}`)
        
        // Remove from local state
        this.syncedEvents = this.syncedEvents.filter(e => e.id !== id)
        
        return true
      } catch (error: any) {
        console.error('[Calendar] Error deleting persisted event:', error)
        return false
      }
    },
    
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
        let result = { success: false, eventId: null as string | null };
        const connectedAccounts = this.getConnectedAccounts;
        
        // Try to create the event in the connected account if available
        if (connectedAccounts.length > 0) {
          // If account ID is specified and exists, use that
          let account;
          if (event.accountId) {
            account = connectedAccounts.find(a => a.id === event.accountId);
          }
          
          // Otherwise use the first connected account
          if (!account) {
            account = connectedAccounts[0];
          }
          
          const calendarProvider = getCalendarProvider(account);
          
          // Check if authenticated
          if (!calendarProvider.isAuthenticated()) {
            const authenticated = await calendarProvider.authenticate();
            if (!authenticated) {
              console.error('[Calendar] Not authenticated with calendar provider');
            } else {
              // Create the event in the provider
              const providerResult = await calendarProvider.createEvent(event);
              result = { 
                success: providerResult.success, 
                eventId: providerResult.eventId || null 
              };
            }
          } else {
            // Create the event in the provider
            const providerResult = await calendarProvider.createEvent(event);
            result = { 
              success: providerResult.success, 
              eventId: providerResult.eventId || null 
            };
          }
        }
        
        // Regardless of remote success, also persist locally 
        const persistedId = await this.persistEvent(event);
        
        // If remote creation succeeded, add to events with the remote ID
        if (result.success && result.eventId) {
          const account = connectedAccounts.find(a => a.id === event.accountId) || connectedAccounts[0];
          this.events.push({
            ...event,
            id: result.eventId,
            accountId: account.id
          });
        } 
        // Otherwise if only local persistence succeeded, add with the local ID
        else if (persistedId) {
          this.events.push({
            ...event,
            id: persistedId
          });
          
          // Update the result to indicate success
          result = { 
            success: true, 
            eventId: persistedId 
          };
        }
        
        return result;
      } catch (error) {
        console.error('[Calendar] Error creating event:', error)
        return { success: false, eventId: null }
      }
    },
    
    /**
     * Update an existing calendar event
     */
    async updateEvent(event: CalendarEvent) {
      try {
        let success = false;
        
        // If this is a synced event (from a connected account), try to update it there
        if (event.accountId) {
          const connectedAccounts = this.getConnectedAccounts;
          const account = connectedAccounts.find(a => a.id === event.accountId);
          
          if (account) {
            const calendarProvider = getCalendarProvider(account);
            
            // Check if authenticated
            if (!calendarProvider.isAuthenticated()) {
              const authenticated = await calendarProvider.authenticate();
              if (authenticated) {
                // Update the remote event
                success = await calendarProvider.updateEvent(event);
              }
            } else {
              // Update the remote event
              success = await calendarProvider.updateEvent(event);
            }
          }
        }
        
        // Check if this is an event we have persisted locally
        const syncedEvent = this.syncedEvents.find(e => e.id === event.id);
        
        if (syncedEvent) {
          // Update in Firestore as well
          const localSuccess = await this.updatePersistedEvent(event.id, event);
          success = success || localSuccess;
        } else {
          // This might be a new event that wasn't persisted yet
          // Try to persist it now
          const persistedId = await this.persistEvent(event);
          success = success || !!persistedId;
        }
        
        // Update local state
        const index = this.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
          this.events[index] = { ...event };
        }
        
        return success;
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
        let success = false;
        
        // Find the event in local state
        const event = this.events.find(e => e.id === eventId);
        
        // If this is an event from a connected account, try to delete it there
        if (event && event.accountId) {
          const connectedAccounts = this.getConnectedAccounts;
          const account = connectedAccounts.find(a => a.id === event.accountId);
          
          if (account) {
            const calendarProvider = getCalendarProvider(account);
            
            // Check if authenticated
            if (!calendarProvider.isAuthenticated()) {
              const authenticated = await calendarProvider.authenticate();
              if (authenticated) {
                // Delete from remote
                success = await calendarProvider.deleteEvent(eventId);
              }
            } else {
              // Delete from remote
              success = await calendarProvider.deleteEvent(eventId);
            }
          }
        }
        
        // Check if this is a persisted event
        const syncedEvent = this.syncedEvents.find(e => e.id === eventId);
        
        if (syncedEvent) {
          // Delete from Firestore as well
          const localSuccess = await this.deletePersistedEvent(eventId);
          success = success || localSuccess;
        }
        
        // Always remove from local state, regardless of remote success
        this.events = this.events.filter(e => e.id !== eventId);
        
        return success;
      } catch (error) {
        console.error('[Calendar] Error deleting event:', error)
        return false
      }
    }
  },
  
  persist: true
})
