import type { Task } from '~/types/models'
import type { IntegrationAccount } from '~/types/models'

/**
 * Query parameters for task lists
 */
export interface TaskQuery {
  completed?: boolean
  dueAfter?: Date
  dueBefore?: Date
  dueDateStart?: Date
  dueDateEnd?: Date
  limit?: number
  tags?: string[]
  status?: string
  priority?: number
  type?: string
  query?: string
}

/**
 * Pagination information for task lists
 */
export interface TaskPagination {
  page: number
  pageSize: number
  hasMore?: boolean
  totalCount?: number
}

/**
 * Response for fetchTasks operation
 */
export interface FetchTasksResponse {
  success: boolean
  tasks: Task[]
  pagination?: TaskPagination
  totalCount?: number
  hasMore?: boolean
  error?: string
  page?: {
    pageSize: number;
    current: number;
    hasMore: boolean;
    totalCount?: number;
  };
}

// For backwards compatibility with existing code
export type TaskFetchResult = FetchTasksResponse

/**
 * Response for createTask operation
 */
export interface CreateTaskResponse {
  success: boolean
  taskId?: string
  error?: string
}

/**
 * Base interface for task providers
 * All external task provider implementations must implement this interface
 */
export interface TaskProvider {
  /**
   * Get the account information for this provider
   */
  getAccount(): IntegrationAccount
  
  /**
   * Check if the provider is authenticated
   */
  isAuthenticated(): boolean
  
  /**
   * Authenticate with the provider
   * @returns A boolean indicating if authentication was successful
   */
  authenticate(): Promise<boolean>
  
  /**
   * Fetch all tasks from the provider
   * @returns A response containing success status and tasks
   */
  fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse>
  
  /**
   * Create a new task in the provider
   * @param task Task data to create
   * @returns A response containing success status and the created task ID
   */
  createTask(task: Partial<Task>): Promise<CreateTaskResponse>
  
  /**
   * Update an existing task in the provider
   * @param taskId The provider's task ID
   * @param updates Changes to apply to the task
   * @returns A boolean indicating if the update was successful
   */
  updateTask(taskId: string, updates: Partial<Task>): Promise<boolean>
  
  /**
   * Delete a task from the provider
   * @param taskId The provider's task ID
   * @returns A boolean indicating if the deletion was successful
   */
  deleteTask(taskId: string): Promise<boolean>
  
  /**
   * Mark a task as complete in the provider
   * @param taskId The provider's task ID
   * @returns A boolean indicating if the operation was successful
   */
  completeTask(taskId: string): Promise<boolean>
}
