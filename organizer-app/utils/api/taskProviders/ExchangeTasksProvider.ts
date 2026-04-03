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

// Add a provider-specific field to track task list ID
interface ExchangeTask extends Task {
  providerListId?: string;
}

/**
 * Maps a Microsoft To Do task to our application's Task model
 */
function mapTodoTaskToTask(todoTask: any, userId: string, taskListId: string): ExchangeTask {
  const dueDate = todoTask.dueDateTime ? new Date(todoTask.dueDateTime.dateTime) : undefined
  const completedAt = todoTask.completedDateTime ? new Date(todoTask.completedDateTime.dateTime) : undefined
  const updatedAt = todoTask.lastModifiedDateTime ? new Date(todoTask.lastModifiedDateTime) : new Date()
  const createdAt = todoTask.createdDateTime ? new Date(todoTask.createdDateTime) : updatedAt

  let status: 'todo' | 'inProgress' | 'completed' | 'delegated' | 'cancelled' = 'todo'
  if (completedAt) {
    status = 'completed'
  } else if (todoTask.status === 'inProgress' || todoTask.body?.content?.includes('#inprogress')) {
    status = 'inProgress'
  } else if (todoTask.status === 'notStarted') {
    status = 'todo'
  }

  const tags: string[] = []
  if (todoTask.categories && todoTask.categories.length > 0) {
    todoTask.categories.forEach((category: string) => {
      tags.push(category.toLowerCase())
    })
  }
  if (todoTask.body && todoTask.body.content) {
    const tagMatches = todoTask.body.content.match(/#[a-zA-Z0-9_-]+/g)
    if (tagMatches) {
      tagMatches.forEach((tag: string) => {
        const tagValue = tag.substring(1).toLowerCase()
        if (!tags.includes(tagValue)) tags.push(tagValue)
      })
    }
  }

  let priority: 'low' | 'medium' | 'high' | 'urgent'
  switch (todoTask.importance) {
    case 'high': priority = 'high'; break
    case 'low': priority = 'low'; break
    default: priority = 'medium'
  }

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
function mapTaskToTodoTask(task: Partial<ExchangeTask>): any {
  const todoTask: any = {
    title: task.title || 'Untitled Task',
  }

  if (task.description) {
    todoTask.body = { contentType: 'text', content: task.description }
  }

  if (task.dueDate) {
    todoTask.dueDateTime = {
      dateTime: new Date(task.dueDate).toISOString(),
      timeZone: 'UTC'
    }
  }

  if (task.priority) {
    switch (task.priority) {
      case 'high':
      case 'urgent':
        todoTask.importance = 'high'; break
      case 'low':
        todoTask.importance = 'low'; break
      default:
        todoTask.importance = 'normal'
    }
  }

  if (task.status === 'completed') {
    todoTask.status = 'completed'
    todoTask.completedDateTime = {
      dateTime: (task.completedAt || new Date()).toISOString(),
      timeZone: 'UTC'
    }
  } else {
    todoTask.status = task.status === 'inProgress' ? 'inProgress' : 'notStarted'
  }

  if (task.tags && task.tags.length > 0) {
    todoTask.categories = task.tags.map(tag => tag)
  }

  return todoTask
}

/**
 * Exchange Tasks provider implementation using Microsoft Graph API (To Do)
 */
export class ExchangeTasksProvider implements TaskProvider {
  account: IntegrationAccount
  private defaultTaskListId: string = ''
  private taskLists: any[] = []

  constructor(account: IntegrationAccount) {
    this.account = account
  }

  getAccount() {
    return this.account
  }

  isAuthenticated() {
    return !!(
      this.account?.oauthData?.accessToken &&
      this.account?.oauthData?.connected
    )
  }

  async authenticate(): Promise<boolean> {
    if (!this.account?.oauthData?.refreshToken) {
      console.error('No refresh token available for Exchange account')
      return false
    }

    if (this.isAuthenticated()) {
      const tokenExpiry = new Date(this.account.oauthData.tokenExpiry || 0)
      if (tokenExpiry.getTime() > Date.now() + 5 * 60 * 1000) {
        return true
      }
    }

    try {
      const nuxtApp = useNuxtApp()
      const fetchFunc = nuxtApp.$fetch as any

      const response = await fetchFunc('/api/auth/refresh', {
        method: 'POST',
        body: {
          refreshToken: this.account.oauthData.refreshToken,
          provider: 'exchange'
        }
      })

      if (response.accessToken) {
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

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        throw new Error('Not authenticated with Exchange')
      }
    }

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

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(
          `Microsoft Graph request failed: ${response.status} ${response.statusText} ${errText}`
        )
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        return await response.json()
      }
      return await response.text()
    } catch (error: any) {
      if (error.status === 401) {
        const authenticated = await this.authenticate()
        if (authenticated) {
          return this.makeRequest(endpoint, method, body)
        }
      }
      throw error
    }
  }

  private async getTaskLists(): Promise<any[]> {
    if (this.taskLists.length > 0) {
      return this.taskLists
    }
    const response = await this.makeRequest('/me/todo/lists')
    this.taskLists = response.value || []
    return this.taskLists
  }

  private async getDefaultTaskList(): Promise<string> {
    if (this.defaultTaskListId) {
      return this.defaultTaskListId
    }

    const taskLists = await this.getTaskLists()

    if (taskLists.length > 0) {
      this.defaultTaskListId = taskLists[0].id
      return this.defaultTaskListId
    }

    const newList = await this.makeRequest('/me/todo/lists', 'POST', {
      displayName: 'Organizer Tasks'
    })
    this.defaultTaskListId = newList.id
    this.taskLists.push(newList)
    return this.defaultTaskListId
  }

  async fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse> {
    try {
      const taskListId = await this.getDefaultTaskList()
      const response = await this.makeRequest(`/me/todo/lists/${taskListId}/tasks`)
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
      console.error('Error fetching tasks from Exchange:', error)
      return {
        success: false,
        tasks: [],
        error: error.message || 'Failed to fetch tasks from Exchange'
      }
    }
  }

  async createTask(task: Partial<Task>): Promise<CreateTaskResponse> {
    try {
      const taskListId = await this.getDefaultTaskList()
      const todoTask = mapTaskToTodoTask(task as Partial<ExchangeTask>)
      const response = await this.makeRequest(
        `/me/todo/lists/${taskListId}/tasks`,
        'POST',
        todoTask
      )
      return { success: true, taskId: response.id }
    } catch (error: any) {
      console.error('Error creating task in Exchange:', error)
      return { success: false, error: error.message || 'Failed to create task in Exchange' }
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const todoUpdates = updates as Partial<ExchangeTask>
      const taskListId = todoUpdates.providerListId || await this.getDefaultTaskList()
      const todoTask = mapTaskToTodoTask(todoUpdates)
      await this.makeRequest(`/me/todo/lists/${taskListId}/tasks/${taskId}`, 'PATCH', todoTask)
      return true
    } catch (error) {
      console.error('Error updating task in Exchange:', error)
      return false
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const taskLists = await this.getTaskLists()
      for (const list of taskLists) {
        try {
          await this.makeRequest(`/me/todo/lists/${list.id}/tasks/${taskId}`, 'DELETE')
          return true
        } catch (error: any) {
          if (error.status !== 404) throw error
        }
      }
      return false
    } catch (error) {
      console.error('Error deleting task from Exchange:', error)
      return false
    }
  }

  async completeTask(taskId: string): Promise<boolean> {
    try {
      const taskLists = await this.getTaskLists()
      for (const list of taskLists) {
        try {
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
          if (error.status !== 404) throw error
        }
      }
      return false
    } catch (error) {
      console.error('Error completing task in Exchange:', error)
      return false
    }
  }
}
