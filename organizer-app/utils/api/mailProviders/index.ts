/**
 * Mail providers module
 * @module utils/api/mailProviders
 */

import type { IntegrationAccount } from '~/types/models'
import { GmailProvider } from './GmailProvider'
import { Office365Provider } from './Office365Provider'
import { ExchangeProvider } from './ExchangeProvider'
import { ImapProvider } from './ImapProvider'
import { Pop3Provider } from './Pop3Provider'
import type { MailProvider } from './MailProvider'

export * from './MailProvider'
export * from './BaseMailProvider'
export * from './GmailProvider'
export * from './Office365Provider'
export * from './ExchangeProvider'
export * from './ImapProvider'
export * from './Pop3Provider'

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
      return new ExchangeProvider(account)
    case 'imap':
      return new ImapProvider(account)
    case 'pop3':
      return new Pop3Provider(account)
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
