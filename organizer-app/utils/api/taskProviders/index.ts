import type { IntegrationAccount, Task } from '~/types/models'
import type { TaskProvider, TaskQuery, TaskPagination, FetchTasksResponse, CreateTaskResponse } from './TaskProvider'
import { GoogleTasksProvider } from './GoogleTasksProvider'
import { Office365TasksProvider } from './Office365TasksProvider'
import { ExchangeTasksProvider } from './ExchangeTasksProvider'

/**
 * Factory function to create a task provider instance based on the account type
 * @param account The integration account
 * @returns A TaskProvider instance
 */
export function createTasksProvider(account: IntegrationAccount): TaskProvider {
  // Create the appropriate provider based on account type
  switch (account.type) {
    case 'google':
      return new GoogleTasksProvider(account)
    
    case 'office365':
      return new Office365TasksProvider(account)
    
    case 'exchange':
      return new ExchangeTasksProvider(account)
    
    default:
      // Create a base implementation for unsupported provider types
      const baseProvider: TaskProvider = {
        // Store the account reference for getAccount
        account,
        
        // Return the account
        getAccount() {
          return this.account
        },
        
        // Default authentication check
        isAuthenticated() {
          return !!this.account?.oauthData?.accessToken
        },
        
        // Default authenticate implementation
        async authenticate() {
          return this.isAuthenticated()
        },
        
        // Default fetch implementation
        async fetchTasks() {
          return {
            success: false,
            tasks: [],
            error: `Not implemented for provider type: ${account.type}`
          }
        },
        
        // Default create implementation
        async createTask() {
          return {
            success: false,
            error: `Not implemented for provider type: ${account.type}`
          }
        },
        
        // Default update implementation
        async updateTask() {
          return false
        },
        
        // Default delete implementation
        async deleteTask() {
          return false
        },
        
        // Default complete implementation
        async completeTask() {
          return false
        }
      }
      
      return baseProvider
  }
}

/**
 * Re-export types from TaskProvider
 */
export type { 
  TaskProvider,
  TaskQuery, 
  TaskPagination, 
  FetchTasksResponse, 
  CreateTaskResponse 
} from './TaskProvider'
