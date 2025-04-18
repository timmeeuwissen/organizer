import type { Task, IntegrationAccount } from '~/types/models'
import type { 
  TaskQuery,
  FetchTasksResponse,
  CreateTaskResponse
} from './TaskProvider'
import { BaseTaskProvider } from './BaseTaskProvider'
import { BaseProvider } from '../core/BaseProvider'

// Google Tasks API base URL
const API_BASE_URL = 'https://tasks.googleapis.com/tasks/v1'

// Add a provider-specific field to Track task list ID
interface GoogleTask extends Task {
  providerListId?: string;
}

/**
 * Maps a Google Task API task to our application's Task model
 * @param googleTask The task from Google Tasks API
 * @param userId User ID to associate with this task
 * @param taskListId The ID of the task list this task belongs to
 */
function mapGoogleTaskToTask(googleTask: any, userId: string, taskListId: string): GoogleTask {
  // Convert Google's date strings to Date objects
  const dueDate = googleTask.due ? new Date(googleTask.due) : undefined
  const updatedAt = googleTask.updated ? new Date(googleTask.updated) : new Date()
  const completedAt = googleTask.completed ? new Date(googleTask.completed) : undefined
  
  // Determine status based on Google Task's status and completedAt
  let status: 'todo' | 'inProgress' | 'completed' | 'delegated' | 'cancelled' = 'todo'
  if (googleTask.status === 'completed') {
    status = 'completed'
  } else if (googleTask.status === 'needsAction') {
    // Check for any notes/tags that might indicate in-progress
    status = googleTask.notes?.includes('#inprogress') ? 'inProgress' : 'todo'
  }

  // Extract tags from notes if available
  const tags: string[] = []
  if (googleTask.notes) {
    const tagMatches = googleTask.notes.match(/#[a-zA-Z0-9_-]+/g)
    if (tagMatches) {
      tagMatches.forEach((tag: string) => tags.push(tag.substring(1)))
    }
  }

  // Create a Task object from Google Task data, ensuring no undefined values
  return {
    id: googleTask.id || `google-task-${Date.now()}`,
    userId: userId || '',
    title: googleTask.title || 'Untitled Task',
    description: googleTask.notes || '',
    status,
    priority: 'medium', // Google Tasks doesn't have priority
    type: 'task',
    tags: tags || [],
    dueDate: dueDate,
    completedAt: completedAt,
    createdAt: updatedAt || new Date(), // Google doesn't provide creation date
    updatedAt: updatedAt || new Date(),
    subtasks: [],
    comments: [],
    relatedProjects: [],
    relatedMeetings: [],
    relatedBehaviors: [],
    providerId: googleTask.id || '',
    providerAccountId: userId || '', // Use the userId as the account ID
    providerListId: taskListId || '', // Store the task list ID
    providerUpdatedAt: updatedAt || new Date()
  }
}

/**
 * Maps our Task model to a Google Task API format
 */
function mapTaskToGoogleTask(task: Partial<GoogleTask>): any {
  const googleTask: any = {
    title: task.title || 'Untitled Task',
    notes: task.description || ''
  }
  
  // Add tags to notes as hashtags
  if (task.tags && task.tags.length > 0) {
    const tagString = task.tags.map(tag => `#${tag}`).join(' ')
    if (googleTask.notes) {
      // Extract any existing notes that aren't tags
      const notesWithoutTags = googleTask.notes.replace(/#[a-zA-Z0-9_-]+/g, '').trim()
      googleTask.notes = `${notesWithoutTags}\n\n${tagString}`.trim()
    } else {
      googleTask.notes = tagString
    }
  }
  
  // Add status handling
  if (task.status === 'completed') {
    googleTask.status = 'completed'
    googleTask.completed = task.completedAt ? task.completedAt.toISOString() : new Date().toISOString()
  } else {
    googleTask.status = 'needsAction'
    
    // Store inProgress state as a tag in notes
    if (task.status === 'inProgress' && googleTask.notes) {
      if (!googleTask.notes.includes('#inprogress')) {
        googleTask.notes += ' #inprogress'
      }
    } else if (task.status !== 'inProgress') {
      // Remove inprogress tag if task is no longer in progress
      googleTask.notes = googleTask.notes.replace(/#inprogress/g, '').trim()
    }
  }
  
  // Add due date if available
  if (task.dueDate) {
    // Google Tasks API requires RFC 3339 timestamp for due date
    // Setting time to end of day because Google only uses dates
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(23, 59, 59, 999)
    googleTask.due = dueDate.toISOString()
  }
  
  return googleTask
}

/**
 * Google Tasks provider implementation
 */
export class GoogleTasksProvider extends BaseTaskProvider {
  // Store the default task list ID
  private defaultTaskListId: string = ''
  // Store the task lists
  private taskLists: any[] = []
  
  /**
   * Get all task lists from Google Tasks API
   */
  private async getTaskLists(): Promise<any[]> {
    if (this.taskLists.length > 0) {
      return this.taskLists
    }
    
    try {
      const data = await this.makeApiRequest<any>('/users/@me/lists')
      this.taskLists = data.items || []
      return this.taskLists
    } catch (error) {
      console.error('[GoogleTasks] Error fetching task lists:', error)
      return []
    }
  }
  
  /**
   * Get or create a default task list
   */
  private async getDefaultTaskList(): Promise<string> {
    if (this.defaultTaskListId) {
      return this.defaultTaskListId
    }
    
    const taskLists = await this.getTaskLists()
    
    if (taskLists.length > 0) {
      // Use the first task list as default
      this.defaultTaskListId = taskLists[0].id
      return this.defaultTaskListId
    }
    
    // If no task list exists, create a new one
    const newList = await this.makeApiRequest<any>(
      '/users/@me/lists', 
      { 
        method: 'POST',
        body: { title: 'Organizer Tasks' }
      }
    )
    
    this.defaultTaskListId = newList.id
    this.taskLists.push(newList)
    return this.defaultTaskListId
  }
  
  /**
   * Make a request to the Google Tasks API
   */
  private async makeApiRequest<T>(
    endpoint: string, 
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', 
      params?: Record<string, string>,
      body?: any
    } = {}
  ): Promise<T> {
    // Build URL with query parameters if provided
    let url = `${API_BASE_URL}${endpoint}`
    
    // Use the makeRequest helper from BaseProvider through the proxy
    return await super.makeRequest<T>(`/api/proxy?url=${encodeURIComponent(url)}`, {
      method: options.method || 'GET',
      params: options.params,
      body: options.body
    });
  }
  
  /**
   * Fetch tasks from Google Tasks API
   */
  async fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse> {
    try {
      const taskListId = await this.getDefaultTaskList()
      const params: Record<string, string> = {}
      
      // Handle pagination
      if (query?.limit) {
        params.maxResults = query.limit.toString()
      }
      
      // Add showCompleted flag based on query
      params.showCompleted = query?.completed === false ? 'false' : 'true'
      
      // Add showHidden to include hidden tasks
      params.showHidden = 'true'
      
      // Make the request to Google Tasks API
      const response = await this.makeApiRequest<any>(`/lists/${taskListId}/tasks`, {
        method: 'GET',
        params
      })
      
      // Convert Google Tasks to our app's Task format
      const tasks = (response.items || []).map((item: any) => 
        mapGoogleTaskToTask(item, this.account.id, taskListId)
      )
      
      return {
        success: true,
        tasks,
        page: {
          current: 1,
          pageSize: tasks.length,
          hasMore: !!response.nextPageToken,
          totalCount: tasks.length
        }
      }
    } catch (error: any) {
      console.error('[GoogleTasks] Error fetching tasks:', error)
      return {
        success: false,
        tasks: [],
        error: error.message || 'Failed to fetch tasks from Google Tasks'
      }
    }
  }
  
  /**
   * Create a task in Google Tasks
   */
  async createTask(task: Partial<Task>): Promise<CreateTaskResponse> {
    try {
      const taskListId = await this.getDefaultTaskList()
      const googleTask = mapTaskToGoogleTask(task as Partial<GoogleTask>)
      
      // Create the task in Google Tasks
      const response = await this.makeApiRequest<any>(
        `/lists/${taskListId}/tasks`, 
        {
          method: 'POST',
          body: googleTask
        }
      )
      
      return {
        success: true,
        taskId: response.id
      }
    } catch (error: any) {
      console.error('[GoogleTasks] Error creating task:', error)
      return {
        success: false,
        error: error.message || 'Failed to create task in Google Tasks'
      }
    }
  }
  
  /**
   * Update a task in Google Tasks
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    try {
      // Cast to our extended type to access providerListId
      const googleUpdates = updates as Partial<GoogleTask>
      
      // Find which task list this task belongs to
      const taskListId = googleUpdates.providerListId || await this.getDefaultTaskList()
      
      // First, get the current task to preserve fields not included in updates
      const currentTask = await this.makeApiRequest<any>(
        `/lists/${taskListId}/tasks/${taskId}`
      )
      
      // Merge with updates
      const googleTask = mapTaskToGoogleTask({
        ...mapGoogleTaskToTask(currentTask, this.account.id, taskListId),
        ...googleUpdates
      })
      
      // Update the task in Google Tasks
      await this.makeApiRequest<any>(
        `/lists/${taskListId}/tasks/${taskId}`, 
        {
          method: 'PUT',
          body: googleTask
        }
      )
      
      return true
    } catch (error) {
      console.error('[GoogleTasks] Error updating task:', error)
      return false
    }
  }
  
  /**
   * Delete a task from Google Tasks
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      // We need to find which task list this task belongs to
      // Since we don't store that information, we need to check each list
      const taskLists = await this.getTaskLists()
      
      for (const list of taskLists) {
        try {
          await this.makeApiRequest<void>(
            `/lists/${list.id}/tasks/${taskId}`, 
            { method: 'DELETE' }
          )
          return true
        } catch (error: any) {
          // If task not found in this list, try next list
          if (error.status !== 404) {
            throw error
          }
        }
      }
      
      // If we get here, the task was not found in any list
      return false
    } catch (error) {
      console.error('[GoogleTasks] Error deleting task:', error)
      return false
    }
  }
  
  /**
   * Mark a task as complete in Google Tasks
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      // Find which task list this task belongs to
      const taskLists = await this.getTaskLists()
      
      for (const list of taskLists) {
        try {
          const task = await this.makeApiRequest<any>(`/lists/${list.id}/tasks/${taskId}`)
          
          // Update the task status to completed
          task.status = 'completed'
          task.completed = new Date().toISOString()
          
          await this.makeApiRequest<any>(
            `/lists/${list.id}/tasks/${taskId}`, 
            {
              method: 'PUT',
              body: task
            }
          )
          
          return true
        } catch (error: any) {
          // If task not found in this list, try next list
          if (error.status !== 404) {
            throw error
          }
        }
      }
      
      // If we get here, the task was not found in any list
      return false
    } catch (error) {
      console.error('[GoogleTasks] Error completing task:', error)
      return false
    }
  }
}
