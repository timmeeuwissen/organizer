/**
 * This file is kept for backward compatibility.
 * Please use the modular imports from './contactProviders/' directory instead.
 */

import type { IntegrationAccount } from '~/types/models'
import type { ContactProvider } from './contactProviders/ContactProvider'
import { GoogleContactsProvider } from './contactProviders/GoogleContactsProvider'
import { Office365ContactsProvider } from './contactProviders/Office365ContactsProvider'
import { ExchangeContactsProvider } from './contactProviders/ExchangeContactsProvider'

// Important: We're not using export * to avoid circular dependency issues
// Instead, we're explicitly exporting functions needed by the application

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

// Re-export the types and classes that might be needed
export type { ContactProvider }
export { GoogleContactsProvider, Office365ContactsProvider, ExchangeContactsProvider }
