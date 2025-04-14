import type { CalendarEvent } from '~/stores/calendar'

/**
 * Calendar event query parameters
 */
export interface CalendarEventQuery {
  /** Start date for search */
  startDate?: Date;
  /** End date for search */
  endDate?: Date;
  /** Calendar ID to filter by */
  calendarId?: string;
}

/**
 * Calendar fetch results
 */
export interface CalendarFetchResult {
  /** The fetched events */
  events: CalendarEvent[];
  /** Whether there are more events available */
  hasMore: boolean;
}

/**
 * Interface for calendar provider implementations
 */
export interface CalendarProvider {
  /**
   * Check if provider is authenticated
   * @returns True if authenticated
   */
  isAuthenticated(): boolean
  
  /**
   * Authenticate with the calendar provider
   * @returns True if authentication successful
   */
  authenticate(): Promise<boolean>
  
  /**
   * Fetch calendar events with query support
   * @param query Query parameters for filtering events
   * @returns Calendar fetch result
   */
  fetchEvents(query?: CalendarEventQuery): Promise<CalendarFetchResult>
  
  /**
   * Create a calendar event
   * @param event Event to create
   * @returns True if creation was successful and the created event ID
   */
  createEvent(event: CalendarEvent): Promise<{success: boolean, eventId?: string}>
  
  /**
   * Update a calendar event
   * @param event Event to update
   * @returns True if update was successful
   */
  updateEvent(event: CalendarEvent): Promise<boolean>
  
  /**
   * Delete a calendar event
   * @param eventId ID of event to delete
   * @returns True if deletion was successful
   */
  deleteEvent(eventId: string): Promise<boolean>
  
  /**
   * Get available calendars
   * @returns List of calendars
   */
  getCalendars(): Promise<{id: string, name: string, primary: boolean}[]>
}
