import type { IntegrationAccount } from '~/types/models'
import type { CalendarProvider } from './CalendarProvider'
import { GoogleCalendarProvider } from './GoogleCalendarProvider'
import { Office365CalendarProvider } from './Office365CalendarProvider'
import { ExchangeCalendarProvider } from './ExchangeCalendarProvider'

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
      if (account.server?.includes('office365')) {
        return new Office365CalendarProvider(account)
      }
      return new ExchangeCalendarProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

// Export types and provider implementations
export { type CalendarProvider } from './CalendarProvider'
export { GoogleCalendarProvider } from './GoogleCalendarProvider'
export { Office365CalendarProvider } from './Office365CalendarProvider'
export { ExchangeCalendarProvider } from './ExchangeCalendarProvider'
