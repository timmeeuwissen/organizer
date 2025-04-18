import { BaseProvider } from '~/utils/api/core/BaseProvider'
import type { CalendarEvent } from '~/stores/calendar'
import type { 
  CalendarProvider, 
  CalendarEventQuery, 
  CalendarFetchResult 
} from './CalendarProvider'

/**
 * Base class for calendar providers with shared functionality
 */
export abstract class BaseCalendarProvider extends BaseProvider implements CalendarProvider {
  /**
   * Fetch calendar events with query support
   * @param query Query parameters for filtering events
   * @returns Calendar fetch result
   */
  abstract fetchEvents(query?: CalendarEventQuery): Promise<CalendarFetchResult>
  
  /**
   * Create a calendar event
   * @param event Event to create
   * @returns True if creation was successful and the created event ID
   */
  abstract createEvent(event: CalendarEvent): Promise<{success: boolean, eventId?: string}>
  
  /**
   * Update a calendar event
   * @param event Event to update
   * @returns True if update was successful
   */
  abstract updateEvent(event: CalendarEvent): Promise<boolean>
  
  /**
   * Delete a calendar event
   * @param eventId ID of event to delete
   * @returns True if deletion was successful
   */
  abstract deleteEvent(eventId: string): Promise<boolean>
  
  /**
   * Get available calendars
   * @returns List of calendars
   */
  abstract getCalendars(): Promise<{id: string, name: string, primary: boolean}[]>
  
  /**
   * Count events matching a query
   * @param query Query parameters for filtering events
   * @returns Total count of matching events
   */
  async countEvents(query?: CalendarEventQuery): Promise<number> {
    // Default implementation uses fetchEvents
    // Override in provider-specific implementations for better performance
    const result = await this.fetchEvents(query)
    return result.events.length
  }
  
  /**
   * Sync calendar events with the provider
   * @returns Number of events synced
   */
  async syncEvents(): Promise<number> {
    // Default implementation - override in provider-specific implementations
    console.log(`[CalendarProvider] Syncing events for ${this.account.oauthData.email}`)
    return 0
  }
}
