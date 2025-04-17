import type { Task, IntegrationAccount } from '~/types/models'
import type { 
  TaskProvider, 
  TaskQuery,
  FetchTasksResponse,
  CreateTaskResponse
} from './TaskProvider'
import { useNuxtApp } from '#app'

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
export class GoogleTasksProvider implements TaskProvider {
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
   * Authenticate with Google Tasks API
   * This method refreshes the token if necessary
   */
  async authenticate(): Promise<boolean> {
    if (!this.account?.oauthData?.refreshToken) {
      console.error('No refresh token available for Google Tasks account')
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
          provider: 'google'
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
      console.error('Error refreshing Google Tasks token:', error)
      return false
    }
  }
  
  /**
   * Make an authenticated request to the Google Tasks API
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
        throw new Error('Not authenticated with Google Tasks')
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
   * Get all task lists from Google Tasks API
   */
  private async getTaskLists(): Promise<any[]> {
    if (this.taskLists.length > 0) {
      return this.taskLists
    }
    
    const response = await this.makeRequest('/users/@me/lists')
    this.taskLists = response.items || []
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
    const newList = await this.makeRequest('/users/@me/lists', 'POST', {
      title: 'Organizer Tasks'
    })
    
    this.defaultTaskListId = newList.id
    this.taskLists.push(newList)
    return this.defaultTaskListId
  }
  
  /**
   * Fetch tasks from Google Tasks API
   */
  async fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse> {
    try {
      const taskListId = await this.getDefaultTaskList()
      const params = new URLSearchParams()
      
      // Handle pagination
      if (query?.limit) {
        params.append('maxResults', query.limit.toString())
      }
      
      // Add showCompleted flag based on query
      if (query?.completed === false) {
        params.append('showCompleted', 'false')
      } else {
        params.append('showCompleted', 'true')
      }
      
      // Add showHidden to include hidden tasks
      params.append('showHidden', 'true')
      
      // Make the request to Google Tasks API
      const response = await this.makeRequest(`/lists/${taskListId}/tasks?${params.toString()}`)
      
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
      console.error('Error fetching tasks from Google Tasks:', error)
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
      const response = await this.makeRequest(
        `/lists/${taskListId}/tasks`, 
        'POST', 
        googleTask
      )
      
      return {
        success: true,
        taskId: response.id
      }
    } catch (error: any) {
      console.error('Error creating task in Google Tasks:', error)
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
      const currentTask = await this.makeRequest(`/lists/${taskListId}/tasks/${taskId}`)
      
      // Merge with updates
      const googleTask = mapTaskToGoogleTask({
        ...mapGoogleTaskToTask(currentTask, this.account.id, taskListId),
        ...googleUpdates
      })
      
      // Update the task in Google Tasks
      await this.makeRequest(
        `/lists/${taskListId}/tasks/${taskId}`, 
        'PUT', 
        googleTask
      )
      
      return true
    } catch (error) {
      console.error('Error updating task in Google Tasks:', error)
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
          await this.makeRequest(`/lists/${list.id}/tasks/${taskId}`, 'DELETE')
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
      console.error('Error deleting task from Google Tasks:', error)
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
          const task = await this.makeRequest(`/lists/${list.id}/tasks/${taskId}`)
          
          // Update the task status to completed
          task.status = 'completed'
          task.completed = new Date().toISOString()
          
          await this.makeRequest(
            `/lists/${list.id}/tasks/${taskId}`, 
            'PUT',
            task
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
      console.error('Error completing task in Google Tasks:', error)
      return false
    }
  }
}
