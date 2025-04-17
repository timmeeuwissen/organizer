import type { Task, IntegrationAccount } from '~/types/models'
import type { 
  TaskProvider, 
  TaskQuery,
  FetchTasksResponse,
  CreateTaskResponse
} from './TaskProvider'
import { useNuxtApp } from '#app'

// Microsoft Graph API base URL
const API_BASE_URL = 'https://graph.microsoft.com/v1.0'

// Add a provider-specific field to Track task list ID
interface Office365Task extends Task {
  providerListId?: string;
}

/**
 * Maps a Microsoft To Do task to our application's Task model
 * @param todoTask The task from Microsoft To Do API
 * @param userId User ID to associate with this task
 * @param taskListId The ID of the task list this task belongs to
 */
function mapTodoTaskToTask(todoTask: any, userId: string, taskListId: string): Office365Task {
  // Convert Microsoft's date strings to Date objects
  const dueDate = todoTask.dueDateTime ? new Date(todoTask.dueDateTime.dateTime) : undefined
  const completedAt = todoTask.completedDateTime ? new Date(todoTask.completedDateTime.dateTime) : undefined
  const updatedAt = todoTask.lastModifiedDateTime ? new Date(todoTask.lastModifiedDateTime) : new Date()
  const createdAt = todoTask.createdDateTime ? new Date(todoTask.createdDateTime) : updatedAt
  
  // Determine status based on completedDateTime
  let status: 'todo' | 'inProgress' | 'completed' | 'delegated' | 'cancelled' = 'todo'
  if (completedAt) {
    status = 'completed'
  } else if (todoTask.status === 'inProgress' || todoTask.body?.content?.includes('#inprogress')) {
    status = 'inProgress'
  } else if (todoTask.status === 'notStarted') {
    status = 'todo'
  }

  // Extract tags from category values or content
  const tags: string[] = []
  
  // Extract from categories if available
  if (todoTask.categories && todoTask.categories.length > 0) {
    todoTask.categories.forEach((category: string) => {
      tags.push(category.toLowerCase())
    })
  }
  
  // Extract hashtags from content if available
  if (todoTask.body && todoTask.body.content) {
    const tagMatches = todoTask.body.content.match(/#[a-zA-Z0-9_-]+/g)
    if (tagMatches) {
      tagMatches.forEach((tag: string) => {
        const tagValue = tag.substring(1).toLowerCase()
        if (!tags.includes(tagValue)) {
          tags.push(tagValue)
        }
      })
    }
  }

  // Determine priority (Microsoft uses 0 = low, 1 = normal, 2 = high)
  let priority: 'low' | 'medium' | 'high' | 'urgent'
  switch (todoTask.importance) {
    case 'high':
      priority = 'high'
      break
    case 'low':
      priority = 'low'
      break
    default:
      priority = 'medium'
  }

  // Create a Task object from Microsoft Task data
  return {
    id: todoTask.id,
    userId,
    title: todoTask.title || 'Untitled Task',
    description: todoTask.body?.content || '',
    status,
    priority,
    type: 'task',
    tags,
    dueDate,
    completedAt,
    createdAt,
    updatedAt,
    subtasks: [],
    comments: [],
    relatedProjects: [],
    relatedMeetings: [],
    relatedBehaviors: [],
    providerId: todoTask.id,
    providerAccountId: userId,
    providerListId: taskListId,
    providerUpdatedAt: updatedAt
  }
}

/**
 * Maps our Task model to a Microsoft To Do task format
 */
function mapTaskToTodoTask(task: Partial<Office365Task>): any {
  const todoTask: any = {
    title: task.title || 'Untitled Task',
  }
  
  // Add body/content if description exists
  if (task.description) {
    todoTask.body = {
      contentType: 'text',
      content: task.description
    }
  }
  
  // Add due date if available
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate)
    todoTask.dueDateTime = {
      dateTime: dueDate.toISOString(),
      timeZone: 'UTC'
    }
  }
  
  // Add importance based on priority
  if (task.priority) {
    switch (task.priority) {
      case 'high':
      case 'urgent':
        todoTask.importance = 'high'
        break
      case 'low':
        todoTask.importance = 'low'
        break
      default:
        todoTask.importance = 'normal'
    }
  }
  
  // Add status based on task status
  if (task.status === 'completed') {
    todoTask.status = 'completed'
    
    // Add completion date if available or use current date
    if (task.completedAt) {
      todoTask.completedDateTime = {
        dateTime: task.completedAt.toISOString(),
        timeZone: 'UTC'
      }
    } else {
      todoTask.completedDateTime = {
        dateTime: new Date().toISOString(),
        timeZone: 'UTC'
      }
    }
  } else {
    todoTask.status = task.status === 'inProgress' ? 'inProgress' : 'notStarted'
  }
  
  // Add categories from tags
  if (task.tags && task.tags.length > 0) {
    todoTask.categories = task.tags.map(tag => tag)
  }
  
  return todoTask
}

/**
 * Office 365 Tasks provider implementation
 */
export class Office365TasksProvider implements TaskProvider {
  // Store the account for reference
  account: IntegrationAccount
  // Store the default task list ID
  private defaultTaskListId: string = ''
  // Store the task lists
  private taskLists: any[] = []
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }

  /**
   * Get the account information for this provider
   */
  getAccount() {
    return this.account
  }
  
  /**
   * Check if the provider is authenticated
   */
  isAuthenticated() {
    return !!(
      this.account?.oauthData?.accessToken && 
      this.account?.oauthData?.connected
    )
  }
  
  /**
   * Authenticate with Microsoft Graph API
   * This method refreshes the token if necessary
   */
  async authenticate(): Promise<boolean> {
    if (!this.account?.oauthData?.refreshToken) {
      console.error('No refresh token available for Office 365 account')
      return false
    }
    
    // If access token is still valid, return true
    if (this.isAuthenticated()) {
      const tokenExpiry = new Date(this.account.oauthData.tokenExpiry || 0)
      // Check if token is still valid for at least 5 more minutes
      if (tokenExpiry.getTime() > Date.now() + 5 * 60 * 1000) {
        return true
      }
    }
    
    try {
      // Use nuxt's $fetch to refresh the token
      const nuxtApp = useNuxtApp()
      const fetchFunc = nuxtApp.$fetch as any
      
      // Request new token using the refresh token
      const response = await fetchFunc('/api/auth/refresh', {
        method: 'POST',
        body: {
          refreshToken: this.account.oauthData.refreshToken,
          provider: 'office365'
        }
      })
      
      if (response.accessToken) {
        // Update the account with the new token
        this.account.oauthData.accessToken = response.accessToken
        this.account.oauthData.tokenExpiry = new Date(Date.now() + response.expiresIn * 1000)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error refreshing Office 365 token:', error)
      return false
    }
  }
  
  /**
   * Make an authenticated request to the Microsoft Graph API
   */
  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    // Ensure we're authenticated
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        throw new Error('Not authenticated with Office 365')
      }
    }
    
    // Use global fetch directly with proxy through our API
    // This will use a server-side proxy to avoid CORS issues
    const url = `/api/proxy?url=${encodeURIComponent(`${API_BASE_URL}${endpoint}`)}`
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      })
      
      return response
    } catch (error: any) {
      if (error.status === 401) {
        // Token expired, refresh and try again
        const authenticated = await this.authenticate()
        if (authenticated) {
          return this.makeRequest(endpoint, method, body)
        }
      }
      throw error
    }
  }
  
  /**
   * Get all task lists from Office 365 (To Do API)
   */
  private async getTaskLists(): Promise<any[]> {
    if (this.taskLists.length > 0) {
      return this.taskLists
    }
    
    const response = await this.makeRequest('/me/todo/lists')
    this.taskLists = response.value || []
    return this.taskLists
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
    const newList = await this.makeRequest('/me/todo/lists', 'POST', {
      displayName: 'Organizer Tasks'
    })
    
    this.defaultTaskListId = newList.id
    this.taskLists.push(newList)
    return this.defaultTaskListId
  }
  
  /**
   * Fetch tasks from Office 365 To Do
   */
  async fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse> {
    try {
      const taskListId = await this.getDefaultTaskList()
      
      // Make the request to the Microsoft To Do API
      const response = await this.makeRequest(`/me/todo/lists/${taskListId}/tasks`)
      
      // Convert Microsoft Tasks to our app's Task format
      const tasks = (response.value || []).map((item: any) => 
        mapTodoTaskToTask(item, this.account.id, taskListId)
      )
      
      return {
        success: true,
        tasks,
        page: {
          current: 1,
          pageSize: tasks.length,
          hasMore: false,
          totalCount: tasks.length
        }
      }
    } catch (error: any) {
      console.error('Error fetching tasks from Office 365:', error)
      return {
        success: false,
        tasks: [],
        error: error.message || 'Failed to fetch tasks from Office 365'
      }
    }
  }
  
  /**
   * Create a task in Office 365 To Do
   */
  async createTask(task: Partial<Task>): Promise<CreateTaskResponse> {
    try {
      const taskListId = await this.getDefaultTaskList()
      const todoTask = mapTaskToTodoTask(task as Partial<Office365Task>)
      
      // Create the task in Microsoft To Do
      const response = await this.makeRequest(
        `/me/todo/lists/${taskListId}/tasks`, 
        'POST', 
        todoTask
      )
      
      return {
        success: true,
        taskId: response.id
      }
    } catch (error: any) {
      console.error('Error creating task in Office 365:', error)
      return {
        success: false,
        error: error.message || 'Failed to create task in Office 365'
      }
    }
  }
  
  /**
   * Update a task in Office 365 To Do
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    try {
      // Cast to our extended type to access providerListId
      const todoUpdates = updates as Partial<Office365Task>
      
      // Find which task list this task belongs to
      const taskListId = todoUpdates.providerListId || await this.getDefaultTaskList()
      
      // Map our task updates to Microsoft To Do format
      const todoTask = mapTaskToTodoTask(todoUpdates)
      
      // Update the task in Microsoft To Do
      await this.makeRequest(
        `/me/todo/lists/${taskListId}/tasks/${taskId}`, 
        'PATCH', 
        todoTask
      )
      
      return true
    } catch (error) {
      console.error('Error updating task in Office 365:', error)
      return false
    }
  }
  
  /**
   * Delete a task from Office 365 To Do
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      // We need to find which task list this task belongs to
      const taskLists = await this.getTaskLists()
      
      for (const list of taskLists) {
        try {
          await this.makeRequest(`/me/todo/lists/${list.id}/tasks/${taskId}`, 'DELETE')
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
      console.error('Error deleting task from Office 365:', error)
      return false
    }
  }
  
  /**
   * Mark a task as complete in Office 365 To Do
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      // Find which task list this task belongs to
      const taskLists = await this.getTaskLists()
      
      for (const list of taskLists) {
        try {
          // Update task to mark it as completed
          await this.makeRequest(
            `/me/todo/lists/${list.id}/tasks/${taskId}`, 
            'PATCH',
            {
              status: 'completed',
              completedDateTime: {
                dateTime: new Date().toISOString(),
                timeZone: 'UTC'
              }
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
      console.error('Error completing task in Office 365:', error)
      return false
    }
  }
}
