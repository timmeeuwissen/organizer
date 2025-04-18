/**
 * Mail providers module
 * @module utils/api/mailProviders
 */

import type { IntegrationAccount } from '~/types/models'
import { GmailProvider } from './GmailProvider'
import { Office365Provider } from './Office365Provider'
import { ExchangeProvider } from './ExchangeProvider'
import type { MailProvider } from './MailProvider'

export * from './MailProvider'
export * from './BaseMailProvider'
export * from './GmailProvider'
export * from './Office365Provider'
export * from './ExchangeProvider'

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
      // Exchange provider delegates to Office365Provider internally
      return new ExchangeProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

/**
 * Alias for getMailProvider for backward compatibility
 * @deprecated Use getMailProvider instead
 */
export function createMailProvider(account: IntegrationAccount): MailProvider {
  return getMailProvider(account)
}
