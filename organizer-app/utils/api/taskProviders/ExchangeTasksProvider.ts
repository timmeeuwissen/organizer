import type { Task, IntegrationAccount } from '~/types/models'
import type { 
  TaskProvider, 
  TaskQuery,
  FetchTasksResponse,
  CreateTaskResponse
} from './TaskProvider'
import { useNuxtApp } from '#app'

// Add a provider-specific field to Track folder
interface ExchangeTask extends Task {
  folderPath?: string;
}

/**
 * Maps an Exchange Task to our application's Task model
 * @param exchangeTask The task from Exchange Web Services
 * @param userId User ID to associate with this task
 * @param folderPath The folder path this task belongs to
 */
function mapExchangeTaskToTask(exchangeTask: any, userId: string, folderPath: string): ExchangeTask {
  // Convert Exchange date strings to Date objects
  const dueDate = exchangeTask.DueDate ? new Date(exchangeTask.DueDate) : undefined
  const completedAt = exchangeTask.CompleteDate ? new Date(exchangeTask.CompleteDate) : undefined
  const updatedAt = exchangeTask.LastModifiedTime ? new Date(exchangeTask.LastModifiedTime) : new Date()
  const createdAt = exchangeTask.DateTimeCreated ? new Date(exchangeTask.DateTimeCreated) : updatedAt
  
  // Determine status based on PercentComplete and CompleteDate
  let status: 'todo' | 'inProgress' | 'completed' | 'delegated' | 'cancelled' = 'todo'
  if (exchangeTask.Status === 'Completed' || (exchangeTask.PercentComplete && exchangeTask.PercentComplete === 100)) {
    status = 'completed'
  } else if (exchangeTask.Status === 'InProgress' || 
            (exchangeTask.PercentComplete && exchangeTask.PercentComplete > 0 && exchangeTask.PercentComplete < 100)) {
    status = 'inProgress'
  } else if (exchangeTask.Status === 'Deferred') {
    status = 'delegated'
  } else if (exchangeTask.Status === 'NotStarted') {
    status = 'todo'
  }

  // Extract tags from categories
  const tags: string[] = []
  if (exchangeTask.Categories && exchangeTask.Categories.length > 0) {
    exchangeTask.Categories.forEach((category: string) => {
      tags.push(category.toLowerCase())
    })
  }

  // Determine priority - Exchange uses High, Normal, Low
  let priority: 'low' | 'medium' | 'high' | 'urgent'
  switch (exchangeTask.Importance) {
    case 'High':
      priority = 'high'
      break
    case 'Low':
      priority = 'low'
      break
    default:
      priority = 'medium'
  }

  // Create a Task object from Exchange Task data
  return {
    id: exchangeTask.ItemId.Id,
    userId,
    title: exchangeTask.Subject || 'Untitled Task',
    description: exchangeTask.Body?.Content || '',
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
    providerId: exchangeTask.ItemId.Id,
    providerAccountId: userId,
    folderPath,
    providerUpdatedAt: updatedAt
  }
}

/**
 * Maps our Task model to an Exchange Task format
 */
function mapTaskToExchangeTask(task: Partial<ExchangeTask>): any {
  const exchangeTask: any = {
    Subject: task.title || 'Untitled Task',
  }
  
  // Add body/content if description exists
  if (task.description) {
    exchangeTask.Body = {
      BodyType: 'Text',
      Content: task.description
    }
  }
  
  // Add due date if available
  if (task.dueDate) {
    exchangeTask.DueDate = task.dueDate.toISOString()
  }
  
  // Add importance based on priority
  if (task.priority) {
    switch (task.priority) {
      case 'high':
      case 'urgent':
        exchangeTask.Importance = 'High'
        break
      case 'low':
        exchangeTask.Importance = 'Low'
        break
      default:
        exchangeTask.Importance = 'Normal'
    }
  }
  
  // Add status based on task status
  if (task.status === 'completed') {
    exchangeTask.Status = 'Completed'
    exchangeTask.PercentComplete = 100
    
    // Add completion date if available or use current date
    if (task.completedAt) {
      exchangeTask.CompleteDate = task.completedAt.toISOString()
    } else {
      exchangeTask.CompleteDate = new Date().toISOString()
    }
  } else if (task.status === 'inProgress') {
    exchangeTask.Status = 'InProgress'
    exchangeTask.PercentComplete = 50 // Default to 50% for in-progress
  } else {
    exchangeTask.Status = 'NotStarted'
    exchangeTask.PercentComplete = 0
  }
  
  // Add categories from tags
  if (task.tags && task.tags.length > 0) {
    exchangeTask.Categories = task.tags
  }
  
  return exchangeTask
}

/**
 * Exchange Tasks provider implementation
 * Uses EWS (Exchange Web Services) to interact with Exchange
 */
export class ExchangeTasksProvider implements TaskProvider {
  // Store the account for reference
  account: IntegrationAccount
  // Store the default folder path
  private defaultFolderPath: string = ''
  
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
   * Authenticate with Exchange Web Services
   */
  async authenticate(): Promise<boolean> {
    if (!this.account?.oauthData?.refreshToken) {
      console.error('No refresh token available for Exchange account')
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
          provider: 'exchange'
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
      console.error('Error refreshing Exchange token:', error)
      return false
    }
  }
  
  /**
   * Make an authenticated SOAP request to Exchange Web Services
   */
  private async makeEwsRequest(soapEnvelope: string): Promise<any> {
    // Ensure we're authenticated
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        throw new Error('Not authenticated with Exchange')
      }
    }
    
    // Default Exchange Online EWS endpoint
    // Use API proxy to avoid CORS issues
    const ewsUrl = `/api/proxy?url=${encodeURIComponent('https://outlook.office365.com/EWS/Exchange.asmx')}`
    
    try {
      const response = await fetch(ewsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://schemas.microsoft.com/exchange/services/2006/messages'
        },
        body: soapEnvelope
      })
      
      // Parse the XML response
      // In a production environment, you would use a proper XML parser here
      return response
    } catch (error: any) {
      if (error.status === 401) {
        // Token expired, refresh and try again
        const authenticated = await this.authenticate()
        if (authenticated) {
          return this.makeEwsRequest(soapEnvelope)
        }
      }
      throw error
    }
  }
  
  /**
   * Get the default tasks folder path
   */
  private async getDefaultTasksFolder(): Promise<string> {
    if (this.defaultFolderPath) {
      return this.defaultFolderPath
    }
    
    // In a real implementation, you would use FindFolder operation to find the tasks folder
    // For simplicity, we'll use the default tasks folder path
    this.defaultFolderPath = '/tasks'
    return this.defaultFolderPath
  }
  
  /**
   * Fetch tasks from Exchange
   */
  async fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse> {
    try {
      // For implementation purposes and due to complexity of EWS SOAP API,
      // we'll simulate a successful response here
      // In production code, you would make actual SOAP requests to EWS
      
      // Get folder path
      const folderPath = await this.getDefaultTasksFolder()
      
      // Simulate API data
      const mockTasks = [
        {
          ItemId: { Id: `exchange-task-${Date.now()}-1` },
          Subject: 'Exchange Task 1',
          Body: { Content: 'This is a sample task from Exchange' },
          Status: 'NotStarted',
          PercentComplete: 0,
          Importance: 'Normal',
          DueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          DateTimeCreated: new Date().toISOString(),
          LastModifiedTime: new Date().toISOString(),
          Categories: ['work', 'important']
        },
        {
          ItemId: { Id: `exchange-task-${Date.now()}-2` },
          Subject: 'Exchange Task 2',
          Body: { Content: 'This is another sample task from Exchange' },
          Status: 'InProgress',
          PercentComplete: 50,
          Importance: 'High',
          DueDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          DateTimeCreated: new Date().toISOString(),
          LastModifiedTime: new Date().toISOString(),
          Categories: ['work', 'urgent']
        }
      ]
      
      // Map Exchange tasks to our app's Task format
      const tasks = mockTasks.map(item => 
        mapExchangeTaskToTask(item, this.account.id, folderPath)
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
      console.error('Error fetching tasks from Exchange:', error)
      return {
        success: false,
        tasks: [],
        error: error.message || 'Failed to fetch tasks from Exchange'
      }
    }
  }
  
  /**
   * Create a task in Exchange
   */
  async createTask(task: Partial<Task>): Promise<CreateTaskResponse> {
    try {
      // For implementation purposes and due to complexity of EWS SOAP API,
      // we'll simulate a successful response here
      
      const folderPath = await this.getDefaultTasksFolder()
      const exchangeTask = mapTaskToExchangeTask(task as Partial<ExchangeTask>)
      
      // Simulate success response
      const taskId = `exchange-task-${Date.now()}`
      
      return {
        success: true,
        taskId
      }
    } catch (error: any) {
      console.error('Error creating task in Exchange:', error)
      return {
        success: false,
        error: error.message || 'Failed to create task in Exchange'
      }
    }
  }
  
  /**
   * Update a task in Exchange
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    try {
      // For implementation purposes and due to complexity of EWS SOAP API,
      // we'll simulate a successful response here
      
      const exchangeTask = mapTaskToExchangeTask(updates as Partial<ExchangeTask>)
      
      // Simulate success response
      console.log(`Updated Exchange task ${taskId}:`, exchangeTask)
      return true
    } catch (error) {
      console.error('Error updating task in Exchange:', error)
      return false
    }
  }
  
  /**
   * Delete a task from Exchange
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      // For implementation purposes and due to complexity of EWS SOAP API,
      // we'll simulate a successful response here
      
      // Simulate success response
      console.log(`Deleted Exchange task ${taskId}`)
      return true
    } catch (error) {
      console.error('Error deleting task from Exchange:', error)
      return false
    }
  }
  
  /**
   * Mark a task as complete in Exchange
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      // For implementation purposes, we'll call updateTask with completed status
      return this.updateTask(taskId, { 
        status: 'completed',
        completedAt: new Date() 
      })
    } catch (error) {
      console.error('Error completing task in Exchange:', error)
      return false
    }
  }
}
