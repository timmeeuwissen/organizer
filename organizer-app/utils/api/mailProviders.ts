/**
 * This file is kept for backward compatibility.
 * Please use the modular imports from './mailProviders/' directory instead.
 */

import type { IntegrationAccount } from '~/types/models'
import type { MailProvider } from './mailProviders/MailProvider'
import { GmailProvider } from './mailProviders/GmailProvider'
import { Office365Provider } from './mailProviders/Office365Provider'
import { ExchangeProvider } from './mailProviders/ExchangeProvider'

// Important: We're not using export * to avoid circular dependency issues
// Instead, we're explicitly exporting functions needed by the application

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

// Re-export the types and classes that might be needed
export type { MailProvider }
export { GmailProvider, Office365Provider, ExchangeProvider }
