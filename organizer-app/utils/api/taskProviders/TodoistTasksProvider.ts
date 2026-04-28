import { BaseTaskProvider } from './BaseTaskProvider'
import type {
  TaskQuery,
  FetchTasksResponse,
  CreateTaskResponse
} from './TaskProvider'
import type { Task } from '~/types/models'

const API_BASE_URL = 'https://api.todoist.com/api/v1'

// Todoist priority: 1=normal, 2=medium, 3=high, 4=urgent
const PRIORITY_MAP: Record<number, Task['priority']> = {
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'urgent'
}
const PRIORITY_REVERSE: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4
}

function mapTodoistTask(raw: any, accountId: string): Task {
  const dueDate = raw.due?.date ? new Date(raw.due.date) : undefined

  let status: Task['status'] = raw.is_completed ? 'completed' : 'todo'
  if (!raw.is_completed && raw.labels?.includes('in-progress')) {
    status = 'inProgress'
  }

  const tags: string[] = (raw.labels || []).filter((l: string) => l !== 'in-progress')

  return {
    id: raw.id,
    userId: accountId,
    title: raw.content || 'Untitled Task',
    description: raw.description || '',
    status,
    priority: PRIORITY_MAP[raw.priority] ?? 'medium',
    type: 'task',
    tags,
    dueDate,
    completedAt: raw.is_completed ? new Date() : undefined,
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    updatedAt: new Date(),
    subtasks: [],
    comments: [],
    relatedProjects: [],
    relatedMeetings: [],
    relatedBehaviors: [],
    parent: raw.parent_id || undefined,
    providerId: raw.id,
    providerAccountId: accountId,
    providerUpdatedAt: new Date()
  }
}

function mapTaskToTodoist(task: Partial<Task>): Record<string, any> {
  const body: Record<string, any> = {
    content: task.title || 'Untitled Task',
    description: task.description || ''
  }

  if (task.priority) {
    body.priority = PRIORITY_REVERSE[task.priority] ?? 2
  }

  if (task.dueDate) {
    body.due_date = new Date(task.dueDate).toISOString().split('T')[0]
  }

  const labels: string[] = [...(task.tags || [])]
  if (task.status === 'inProgress' && !labels.includes('in-progress')) {
    labels.push('in-progress')
  }
  if (labels.length > 0) {
    body.labels = labels
  }

  if (task.parent) {
    body.parent_id = task.parent
  }

  return body
}

export class TodoistTasksProvider extends BaseTaskProvider {
  // Todoist uses a permanent API token — no expiry
  override isAuthenticated(): boolean {
    return !!this.account.oauthData.accessToken
  }

  // No token refresh needed; just return whether the token exists
  override async authenticate(): Promise<boolean> {
    return this.isAuthenticated()
  }

  private async makeApiRequest<T>(
    endpoint: string,
    options: { method?: string; body?: any } = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    return await super.makeRequest<T>(`/api/proxy?url=${encodeURIComponent(url)}`, {
      method: (options.method as any) || 'GET',
      body: options.body
    })
  }

  async fetchTasks(query?: TaskQuery): Promise<FetchTasksResponse> {
    try {
      const params = new URLSearchParams()
      if (query?.limit) {
        params.set('limit', String(query.limit))
      }
      if (query?.completed !== undefined) {
        // Todoist active vs completed tasks are on separate endpoints
      }

      const endpoint = query?.completed
        ? '/tasks?filter=is%3Acompleted'
        : '/tasks'

      const raw = await this.makeApiRequest<any[]>(endpoint)
      const tasks = raw.map(t => mapTodoistTask(t, this.account.id))

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
      console.error('[Todoist] Error fetching tasks:', error)
      return { success: false, tasks: [], error: error.message || 'Failed to fetch tasks from Todoist' }
    }
  }

  async createTask(task: Partial<Task>): Promise<CreateTaskResponse> {
    try {
      const body = mapTaskToTodoist(task)
      const raw = await this.makeApiRequest<any>('/tasks', { method: 'POST', body })
      return { success: true, taskId: raw.id }
    } catch (error: any) {
      console.error('[Todoist] Error creating task:', error)
      return { success: false, error: error.message || 'Failed to create task in Todoist' }
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const body = mapTaskToTodoist(updates)
      await this.makeApiRequest<any>(`/tasks/${taskId}`, { method: 'POST', body })
      return true
    } catch (error) {
      console.error('[Todoist] Error updating task:', error)
      return false
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await this.makeApiRequest<void>(`/tasks/${taskId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('[Todoist] Error deleting task:', error)
      return false
    }
  }

  async completeTask(taskId: string): Promise<boolean> {
    try {
      await this.makeApiRequest<void>(`/tasks/${taskId}/close`, { method: 'POST' })
      return true
    } catch (error) {
      console.error('[Todoist] Error completing task:', error)
      return false
    }
  }
}
