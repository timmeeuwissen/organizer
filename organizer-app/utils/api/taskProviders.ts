/**
 * This file is kept for backward compatibility.
 * Please use the modular imports from './taskProviders/' directory instead.
 */

import type { IntegrationAccount } from '~/types/models'
import type { TaskProvider } from './taskProviders/TaskProvider'
import { GoogleTasksProvider } from './taskProviders/GoogleTasksProvider'
import { Office365TasksProvider } from './taskProviders/Office365TasksProvider'
import { ExchangeTasksProvider } from './taskProviders/ExchangeTasksProvider'

// Important: We're not using export * to avoid circular dependency issues
// Instead, we're explicitly exporting functions needed by the application

/**
 * Factory function to get the appropriate task provider implementation
 * @param account The integration account
 * @returns Provider implementation for the account type
 */
export function getTaskProvider(account: IntegrationAccount): TaskProvider {
  switch (account.type) {
    case 'google':
      return new GoogleTasksProvider(account)
    case 'office365':
      return new Office365TasksProvider(account)
    case 'exchange':
      return new ExchangeTasksProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

/**
 * Alias for getTaskProvider for backward compatibility
 * @deprecated Use getTaskProvider instead
 */
export function createTasksProvider(account: IntegrationAccount): TaskProvider {
  return getTaskProvider(account)
}

// Re-export the types and classes that might be needed
export type { TaskProvider }
export { GoogleTasksProvider, Office365TasksProvider, ExchangeTasksProvider }
