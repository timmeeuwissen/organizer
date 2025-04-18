/**
 * This file is kept for backward compatibility.
 * Please use the modular imports from './calendarProviders/' directory instead.
 */

import type { IntegrationAccount } from '~/types/models'
import type { CalendarProvider } from './calendarProviders/CalendarProvider'
import { GoogleCalendarProvider } from './calendarProviders/GoogleCalendarProvider'
import { Office365CalendarProvider } from './calendarProviders/Office365CalendarProvider'
import { ExchangeCalendarProvider } from './calendarProviders/ExchangeCalendarProvider'

// Important: We're not using export * to avoid circular dependency issues
// Instead, we're explicitly exporting functions needed by the application

/**
 * Factory function to get the appropriate calendar provider implementation
 * @param account The integration account
 * @returns Provider implementation for the account type
 */
export function getCalendarProvider(account: IntegrationAccount): CalendarProvider {
  switch (account.type) {
    case 'google':
      return new GoogleCalendarProvider(account)
    case 'office365':
      return new Office365CalendarProvider(account)
    case 'exchange':
      return new ExchangeCalendarProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

/**
 * Alias for getCalendarProvider for backward compatibility
 * @deprecated Use getCalendarProvider instead
 */
export function createCalendarProvider(account: IntegrationAccount): CalendarProvider {
  return getCalendarProvider(account)
}

// Re-export the types and classes that might be needed
export type { CalendarProvider }
export { GoogleCalendarProvider, Office365CalendarProvider, ExchangeCalendarProvider }
