/**
 * Contact providers module
 * @module utils/api/contactProviders
 */

import type { IntegrationAccount } from '~/types/models'
import { GoogleContactsProvider } from './GoogleContactsProvider'
import { Office365ContactsProvider } from './Office365ContactsProvider'
import { ExchangeContactsProvider } from './ExchangeContactsProvider'
import type { ContactProvider } from './ContactProvider'

export * from './ContactProvider'
export * from './BaseContactProvider'
export * from './GoogleContactsProvider'
export * from './Office365ContactsProvider'
export * from './ExchangeContactsProvider'

/**
 * Factory function to get the appropriate contact provider implementation
 * @param account The integration account
 * @returns Provider implementation for the account type
 */
export function getContactProvider(account: IntegrationAccount): ContactProvider {
  switch (account.type) {
    case 'google':
      return new GoogleContactsProvider(account)
    case 'office365':
      return new Office365ContactsProvider(account)
    case 'exchange':
      // Exchange provider delegates to Office365ContactsProvider internally
      return new ExchangeContactsProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

/**
 * Alias for getContactProvider for backward compatibility
 * @deprecated Use getContactProvider instead
 */
export function createContactsProvider(account: IntegrationAccount): ContactProvider {
  return getContactProvider(account)
}
