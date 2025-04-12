import type { IntegrationAccount } from '~/types/models'
import type { MailProvider } from './MailProvider'
import { GmailProvider } from './GmailProvider'
import { Office365Provider } from './Office365Provider'
import { ExchangeProvider } from './ExchangeProvider'

/**
 * Factory function to get the appropriate mail provider implementation
 * @param account The integration account
 * @returns Provider implementation for the account type
 */
export function getMailProvider(account: IntegrationAccount): MailProvider {
  switch (account.type) {
    case 'google':
      return new GmailProvider(account)
    case 'office365':
      return new Office365Provider(account)
    case 'exchange':
      if (account.server?.includes('office365')) {
        return new Office365Provider(account)
      }
      return new ExchangeProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

// Export types and provider implementations
export { type MailProvider } from './MailProvider'
export { GmailProvider } from './GmailProvider'
export { Office365Provider } from './Office365Provider'
export { ExchangeProvider } from './ExchangeProvider'
