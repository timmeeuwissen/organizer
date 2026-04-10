/**
 * Calendar providers module
 * @module utils/api/calendarProviders
 */

import { GoogleCalendarProvider } from './GoogleCalendarProvider'
import { Office365CalendarProvider } from './Office365CalendarProvider'
import { ExchangeCalendarProvider } from './ExchangeCalendarProvider'
import type { CalendarProvider } from './CalendarProvider'
import type { IntegrationAccount } from '~/types/models'

export * from './CalendarProvider'
export * from './BaseCalendarProvider'
export * from './GoogleCalendarProvider'
export * from './Office365CalendarProvider'
export * from './ExchangeCalendarProvider'

/**
 * Factory function to get the appropriate calendar provider implementation
 * @param account The integration account
 * @returns Provider implementation for the account type
 */
export function getCalendarProvider (account: IntegrationAccount): CalendarProvider {
  switch (account.type) {
    case 'google':
      return new GoogleCalendarProvider(account)
    case 'office365':
      return new Office365CalendarProvider(account)
    case 'exchange':
      // Exchange provider delegates to Office365CalendarProvider internally
      return new ExchangeCalendarProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

/**
 * Alias for getCalendarProvider for backward compatibility
 * @deprecated Use getCalendarProvider instead
 */
export function createCalendarProvider (account: IntegrationAccount): CalendarProvider {
  return getCalendarProvider(account)
}
