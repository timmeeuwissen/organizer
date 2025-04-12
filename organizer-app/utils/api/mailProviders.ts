// This file is kept for backward compatibility
// Please use the modular imports from './mailProviders/' directory instead

import type { IntegrationAccount } from '~/types/models'
import type { MailProvider } from './mailProviders/MailProvider'
import { GmailProvider } from './mailProviders/GmailProvider'
import { Office365Provider } from './mailProviders/Office365Provider'
import { ExchangeProvider } from './mailProviders/ExchangeProvider'

/**
 * Factory function to get the appropriate mail provider implementation
 * @deprecated Use the modular imports from './mailProviders/' directory instead
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

export type { MailProvider }
