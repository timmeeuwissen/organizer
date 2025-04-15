import { GoogleContactsProvider } from './GoogleContactsProvider'
import { Office365ContactsProvider } from './Office365ContactsProvider'
import { ExchangeContactsProvider } from './ExchangeContactsProvider'
import type { ContactProvider } from './ContactProvider'
import type { IntegrationAccount } from '~/types/models'

/**
 * Create the appropriate contacts provider based on account type
 * @param account The integration account
 * @returns A contacts provider instance
 */
export function createContactsProvider(account: IntegrationAccount): ContactProvider {
  switch (account.type) {
    case 'google':
      return new GoogleContactsProvider(account)
    case 'office365':
      return new Office365ContactsProvider(account)
    case 'exchange':
      return new ExchangeContactsProvider(account)
    default:
      throw new Error(`Unsupported provider type: ${account.type}`)
  }
}

// Export provider classes
export { 
  GoogleContactsProvider,
  Office365ContactsProvider,
  ExchangeContactsProvider
}

// Export provider types
export type { 
  ContactProvider,
  ContactQuery,
  ContactPagination,
  ContactFetchResult
} from './ContactProvider'
