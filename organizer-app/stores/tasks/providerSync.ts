/**
 * Provider sync actions for the tasks store.
 * Each function calls useTasksStore() internally so it always operates on
 * the live store instance — no store-context coupling needed at call time.
 */
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'
import { createTasksProvider } from '~/utils/api/taskProviders'
import type { Task, IntegrationAccount } from '~/types/models'

/** Authenticate a provider, returning true on success. */
async function ensureAuthenticated(
  provider: ReturnType<typeof createTasksProvider>,
  account: IntegrationAccount
): Promise<boolean> {
  if (!provider.isAuthenticated()) {
    const ok = await provider.authenticate()
    if (!ok) {
      console.error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
      return false
    }
  }
  return true
}

/**
 * Set the integration accounts that have task sync enabled.
 * Call from the store action: `this.integrationAccounts = setIntegrationAccounts(accounts)`
 */
export function filterTaskAccounts(accounts: IntegrationAccount[]): IntegrationAccount[] {
  return accounts.filter((a) => a.syncTasks)
}

/**
 * Fetch tasks from all enabled integration accounts in parallel.
 * Returns a map of accountId → Task[].
 */
export async function fetchProviderTasksParallel(
  integrationAccounts: IntegrationAccount[],
  userId: string
): Promise<Record<string, Task[]>> {
  const results = await Promise.all(
    integrationAccounts.map(async (account) => {
      if (!account.syncTasks || !account.oauthData.connected) return null

      try {
        const provider = createTasksProvider(account)
        if (!(await ensureAuthenticated(provider, account))) return null

        const result = await provider.fetchTasks()
        const tasks: Task[] = result.tasks.map((task: Partial<Task>) => ({
          ...task,
          userId,
          id: task.id || crypto.randomUUID(),
          providerId: task.id,
          providerAccountId: account.id,
          providerUpdatedAt: new Date(),
          status: task.status || 'todo',
          title: task.title || 'Untitled Task',
          priority: task.priority || 3,
          type: task.type || 'task',
          tags: task.tags || [],
          subtasks: task.subtasks || [],
          dueDate: task.dueDate || null,
          completedAt: task.completedAt || null,
          createdAt: task.createdAt || new Date(),
          updatedAt: task.updatedAt || new Date(),
          comments: task.comments || [],
        })) as Task[]

        console.log(`Fetched ${tasks.length} tasks from ${account.type} (${account.oauthData.email})`)
        return { accountId: account.id, tasks }
      } catch (err) {
        console.error(`Error fetching tasks from ${account.type} for ${account.oauthData.email}:`, err)
        return null
      }
    })
  )

  const syncedTasks: Record<string, Task[]> = {}
  for (const result of results) {
    if (result) syncedTasks[result.accountId] = result.tasks
  }
  return syncedTasks
}

/**
 * Merge provider tasks into Firestore and the local task list.
 * Skips tasks that already exist and are up-to-date.
 */
export async function mergeProviderTasksIntoFirestore(
  syncedProviderTasks: Record<string, Task[]>,
  localTasks: Task[],
  userId: string,
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
): Promise<void> {
  const allSyncedTasks: Task[] = Object.values(syncedProviderTasks).flat()
  if (!allSyncedTasks.length) return

  const db = getFirestore()
  const tasksRef = collection(db, 'tasks')

  await Promise.all(
    allSyncedTasks.map(async (task) => {
      const existing = localTasks.find(
        (t) => t.providerId === task.providerId && t.providerAccountId === task.providerAccountId
      )

      if (!existing) {
        const taskData: Record<string, unknown> = {
          userId,
          title: task.title || 'Untitled Task',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          type: task.type || 'task',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          tags: task.tags || [],
          subtasks: task.subtasks || [],
          comments: task.comments || [],
          relatedProjects: task.relatedProjects || [],
          relatedMeetings: task.relatedMeetings || [],
          relatedBehaviors: task.relatedBehaviors || [],
          completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : null,
          completedDate: null,
          dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
          providerId: task.providerId || null,
          providerAccountId: task.providerAccountId || null,
          providerUpdatedAt: task.providerUpdatedAt
            ? Timestamp.fromDate(task.providerUpdatedAt)
            : Timestamp.fromDate(new Date()),
          description: task.description || '',
          assignedTo: task.assignedTo || null,
          parentTask: task.parent || task.parentTask || null,
        }
        await addDoc(tasksRef, taskData)
      } else {
        const providerIsNewer =
          task.providerUpdatedAt &&
          (!existing.providerUpdatedAt || task.providerUpdatedAt > existing.providerUpdatedAt)
        if (providerIsNewer || task.status !== existing.status) {
          await updateTask(existing.id, { ...task, providerUpdatedAt: new Date() })
        }
      }
    })
  )
}

export async function createTaskViaProvider(
  task: Partial<Task>,
  accountId: string,
  integrationAccounts: IntegrationAccount[],
  createLocalTask: (task: Partial<Task>) => Promise<string | undefined>
): Promise<string | undefined> {
  const account = integrationAccounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`Account ${accountId} not found`)

  const provider = createTasksProvider(account)
  if (!(await ensureAuthenticated(provider, account))) {
    throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
  }

  const result = await provider.createTask(task)
  if (!result.success || !result.taskId) throw new Error('Failed to create task in provider')

  return createLocalTask({ ...task, providerId: result.taskId, providerAccountId: accountId, providerUpdatedAt: new Date() })
}

export async function updateTaskViaProvider(
  id: string,
  updates: Partial<Task>,
  getById: (id: string) => Task | null,
  integrationAccounts: IntegrationAccount[],
  updateLocalTask: (id: string, updates: Partial<Task>) => Promise<void>
): Promise<boolean> {
  const task = getById(id)
  if (!task) throw new Error('Task not found')
  if (!task.providerId || !task.providerAccountId) throw new Error('Task is not linked to a provider')

  const account = integrationAccounts.find((a) => a.id === task.providerAccountId)
  if (!account) throw new Error(`Provider account ${task.providerAccountId} not found`)

  const provider = createTasksProvider(account)
  if (!(await ensureAuthenticated(provider, account))) {
    throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
  }

  const success = await provider.updateTask(task.providerId, updates)
  if (!success) throw new Error('Failed to update task in provider')

  await updateLocalTask(id, { ...updates, providerUpdatedAt: new Date() })
  return true
}

export async function deleteTaskViaProvider(
  id: string,
  getById: (id: string) => Task | null,
  integrationAccounts: IntegrationAccount[],
  deleteLocalTask: (id: string) => Promise<void>
): Promise<boolean> {
  const task = getById(id)
  if (!task) throw new Error('Task not found')
  if (!task.providerId || !task.providerAccountId) throw new Error('Task is not linked to a provider')

  const account = integrationAccounts.find((a) => a.id === task.providerAccountId)
  if (!account) throw new Error(`Provider account ${task.providerAccountId} not found`)

  const provider = createTasksProvider(account)
  if (!(await ensureAuthenticated(provider, account))) {
    throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
  }

  const success = await provider.deleteTask(task.providerId)
  if (!success) throw new Error('Failed to delete task in provider')

  await deleteLocalTask(id)
  return true
}

export async function completeTaskViaProvider(
  id: string,
  getById: (id: string) => Task | null,
  integrationAccounts: IntegrationAccount[],
  markLocalComplete: (id: string) => Promise<void>
): Promise<boolean> {
  const task = getById(id)
  if (!task) throw new Error('Task not found')
  if (!task.providerId || !task.providerAccountId) throw new Error('Task is not linked to a provider')

  const account = integrationAccounts.find((a) => a.id === task.providerAccountId)
  if (!account) throw new Error(`Provider account ${task.providerAccountId} not found`)

  const provider = createTasksProvider(account)
  if (!(await ensureAuthenticated(provider, account))) {
    throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
  }

  const success = await provider.completeTask(task.providerId)
  if (!success) throw new Error('Failed to complete task in provider')

  await markLocalComplete(id)
  return true
}
