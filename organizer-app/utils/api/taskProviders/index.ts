/**
 * Task providers module
 * @module utils/api/taskProviders
 */

import { GoogleTasksProvider } from './GoogleTasksProvider'
import { Office365TasksProvider } from './Office365TasksProvider'
import { ExchangeTasksProvider } from './ExchangeTasksProvider'
import { TodoistTasksProvider } from './TodoistTasksProvider'
import type { TaskProvider } from './TaskProvider'
import type { IntegrationAccount } from '~/types/models'

export * from './TaskProvider'
export * from './BaseTaskProvider'
export * from './GoogleTasksProvider'
export * from './Office365TasksProvider'
export * from './ExchangeTasksProvider'
export * from './TodoistTasksProvider'

/**
 * Factory function to get the appropriate task provider implementation
 * @param account The integration account
 * @returns Provider implementation for the account type
 */
export function getTaskProvider (account: IntegrationAccount): TaskProvider {
  switch (account.type) {
    case 'google':
      return new GoogleTasksProvider(account)
    case 'office365':
      return new Office365TasksProvider(account)
    case 'exchange':
      return new ExchangeTasksProvider(account)
    case 'todoist':
      return new TodoistTasksProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

/**
 * Alias for getTaskProvider for backward compatibility
 * @deprecated Use getTaskProvider instead
 */
export function createTasksProvider (account: IntegrationAccount): TaskProvider {
  return getTaskProvider(account)
}
