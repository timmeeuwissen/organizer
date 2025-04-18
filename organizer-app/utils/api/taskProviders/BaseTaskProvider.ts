import type { Task, IntegrationAccount } from '~/types/models'
import type { 
  TaskProvider, 
  TaskQuery, 
  FetchTasksResponse, 
  CreateTaskResponse
} from './TaskProvider'
import { BaseProvider } from '../core/BaseProvider'

/**
 * Base class for task providers with shared functionality
 * Extends BaseProvider to get access to makeRequest and authentication methods
 */
export abstract class BaseTaskProvider extends BaseProvider implements TaskProvider {
  /**
   * Get the account information for this provider
   */
  getAccount(): IntegrationAccount {
    return this.account
  }
  
  /**
   * Fetch all tasks from the provider
   * @returns A response containing success status and tasks
   */
  abstract fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse>
  
  /**
   * Create a new task in the provider
   * @param task Task data to create
   * @returns A response containing success status and the created task ID
   */
  abstract createTask(task: Partial<Task>): Promise<CreateTaskResponse>
  
  /**
   * Update an existing task in the provider
   * @param taskId The provider's task ID
   * @param updates Changes to apply to the task
   * @returns A boolean indicating if the update was successful
   */
  abstract updateTask(taskId: string, updates: Partial<Task>): Promise<boolean>
  
  /**
   * Delete a task from the provider
   * @param taskId The provider's task ID
   * @returns A boolean indicating if the deletion was successful
   */
  abstract deleteTask(taskId: string): Promise<boolean>
  
  /**
   * Mark a task as complete in the provider
   * @param taskId The provider's task ID
   * @returns A boolean indicating if the operation was successful
   */
  abstract completeTask(taskId: string): Promise<boolean>
  
  /**
   * Sync tasks with the provider
   * @returns Number of tasks synced
   */
  async syncTasks(): Promise<number> {
    // Default implementation - override in provider-specific implementations
    console.log(`[TaskProvider] Syncing tasks for ${this.account.oauthData.email}`)
    return 0
  }
  
  /**
   * Count tasks matching a query
   * @param query Query parameters for filtering tasks
   * @returns Total count of matching tasks
   */
  async countTasks(query?: TaskQuery): Promise<number> {
    // Default implementation uses fetchTasks
    // Override in provider-specific implementations for better performance
    const result = await this.fetchTasks(query)
    return result.totalCount || result.tasks?.length || 0
  }
}
