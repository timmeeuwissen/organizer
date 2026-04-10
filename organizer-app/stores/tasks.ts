import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
  , getFirestore
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import {
  filterTaskAccounts,
  fetchProviderTasksParallel,
  mergeProviderTasksIntoFirestore,
  createTaskViaProvider,
  updateTaskViaProvider,
  deleteTaskViaProvider,
  completeTaskViaProvider
} from './tasks/providerSync'
import { useNotificationStore } from '~/stores/notification'
import type { Task, Comment, IntegrationAccount } from '~/types/models'

const stripUndefinedFields = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

const normalizeIdLike = (value: unknown): string | null => {
  if (typeof value === 'string' || typeof value === 'number') { return String(value) }
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null
  }
  return null
}

const normalizeIdArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) { return [] }
  return value
    .map(normalizeIdLike)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    currentTask: null as Task | null,
    loading: false,
    error: null as string | null,
    integrationAccounts: [] as IntegrationAccount[],
    syncedProviderTasks: {} as Record<string, Task[]>,
    subtaskParent: null as Task | null
  }),

  getters: {
    getById: taskState => (id: string) => taskState.tasks.find(t => t.id === id) || null,

    todoTasks: taskState => taskState.tasks.filter(t => t.status === 'todo'),
    inProgressTasks: taskState => taskState.tasks.filter(t => t.status === 'inProgress'),
    completedTasks: taskState => taskState.tasks.filter(t => t.status === 'completed'),
    delegatedTasks: taskState => taskState.tasks.filter(t => t.status === 'delegated'),
    cancelledTasks: taskState => taskState.tasks.filter(t => t.status === 'cancelled'),

    getByTag: taskState => (tag: string) => taskState.tasks.filter(t => t.tags.includes(tag)),
    getByAssignee: taskState => (id: string) => taskState.tasks.filter(t => t.assignedTo === id),
    getByProject: taskState => (id: string) =>
      taskState.tasks.filter((t) => {
        const related = normalizeIdArray(t.relatedProjects)
        const direct = normalizeIdLike(t.projectId) || ''
        return related.includes(id) || direct === id
      }),
    getByMeeting: taskState => (id: string) => taskState.tasks.filter(t => t.relatedMeetings?.includes(id)),
    getByBehavior: taskState => (id: string) => taskState.tasks.filter(t => t.relatedBehaviors?.includes(id)),
    getByParent: taskState => (id: string) => taskState.tasks.filter(t => t.parentTask === id),

    upcomingTasks: (taskState) => {
      const nowMs = Date.now()
      const active = taskState.tasks.filter(
        t => (t.status === 'todo' || t.status === 'inProgress') && t.dueDate && t.dueDate.getTime() > nowMs
      )
      active.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
      return active
    },

    overdueTasks: (taskState) => {
      const nowMs = Date.now()
      const overdue = taskState.tasks.filter(
        t => (t.status === 'todo' || t.status === 'inProgress') && t.dueDate && t.dueDate.getTime() < nowMs
      )
      overdue.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
      return overdue
    },

    getTags: (taskState) => {
      const seen = new Set<string>()
      for (const task of taskState.tasks) { for (const tag of task.tags) { seen.add(tag) } }
      return Array.from(seen)
    },

    getRoutineTasks: taskState => taskState.tasks.filter(t => t.type === 'routine'),
    getDelegationTasks: taskState => taskState.tasks.filter(t => t.type === 'delegation'),
    getFollowUpTasks: taskState => taskState.tasks.filter(t => t.type === 'followUp')
  },

  actions: {
    // ─── Firestore CRUD ──────────────────────────────────────────────────

    async fetchTasks () {
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('Not signed in')
      }

      this.loading = true
      this.error = null
      try {
        const db = getFirestore()
        // Do not order in Firestore by dueDate: docs missing dueDate are excluded.
        const snap = await getDocs(
          query(collection(db, 'tasks'), where('userId', '==', userId))
        )
        this.tasks = snap.docs.map((d) => {
          const data = d.data()
          const normalizedProjectId = normalizeIdLike(data.projectId)
          const relatedProjects = normalizeIdArray(data.relatedProjects)
          if (!relatedProjects.length && normalizedProjectId) {
            relatedProjects.push(normalizedProjectId)
          }
          const relatedMeetings = normalizeIdArray(data.relatedMeetings)
          const relatedBehaviors = normalizeIdArray(data.relatedBehaviors)
          const tags = normalizeIdArray(data.tags)
          const subtasks = normalizeIdArray(data.subtasks)
          const comments = Array.isArray(data.comments) ? data.comments : []
          return {
            ...data,
            id: d.id,
            projectId: normalizedProjectId || undefined,
            dueDate: data.dueDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate() || null,
            tags,
            subtasks,
            relatedProjects,
            relatedMeetings,
            relatedBehaviors,
            comments: comments.map((c: Record<string, unknown>) => ({
              ...c,
              createdAt: (c.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
              updatedAt: (c.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date()
            }))
          } as Task
        })
        this.tasks.sort((a, b) => {
          const aDue = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY
          const bDue = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY
          return aDue - bDue
        })
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch tasks'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error fetching tasks:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchTask (id: string) {
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('Not signed in')
      }

      this.loading = true
      this.error = null
      try {
        const snap = await getDoc(doc(getFirestore(), 'tasks', id))
        if (!snap.exists()) { this.error = 'Task not found'; return }

        const data = snap.data()
        if (data.userId !== userId) { throw new Error('Unauthorized access to task') }

        this.currentTask = {
          ...data,
          id: snap.id,
          dueDate: data.dueDate?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || null,
          comments: (data.comments || []).map((c: Record<string, unknown>) => ({
            ...c,
            createdAt: (c.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
            updatedAt: (c.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date()
          }))
        } as Task
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch task'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error fetching task:', err)
      } finally {
        this.loading = false
      }
    },

    async createTask (newTask: Partial<Task>) {
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('Not signed in')
      }

      this.loading = true
      this.error = null
      try {
        const normalizedRelatedProjects = Array.isArray(newTask.relatedProjects)
          ? newTask.relatedProjects.map(value => String(value))
          : newTask.projectId != null
            ? [String(newTask.projectId)]
            : []
        const normalizedProjectId =
          newTask.projectId != null
            ? String(newTask.projectId)
            : normalizedRelatedProjects[0]
        const taskData = stripUndefinedFields({
          ...newTask,
          userId,
          tags: newTask.tags || [],
          subtasks: newTask.subtasks || [],
          comments: newTask.comments || [],
          relatedProjects: normalizedRelatedProjects,
          projectId: normalizedProjectId,
          relatedMeetings: newTask.relatedMeetings || [],
          relatedBehaviors: newTask.relatedBehaviors || [],
          status: newTask.status || 'todo',
          type: newTask.type || 'task',
          priority: newTask.priority || 3,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        const docRef = await addDoc(collection(getFirestore(), 'tasks'), taskData)
        const added = { ...taskData, id: docRef.id, userId, createdAt: new Date(), updatedAt: new Date(), comments: [] } as Task
        this.tasks.push(added)
        this.currentTask = added
        return docRef.id
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to create task'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error creating task:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateTask (id: string, updates: Partial<Task>) {
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('Not signed in')
      }

      this.loading = true
      this.error = null
      try {
        const db = getFirestore()
        const taskRef = doc(db, 'tasks', id)
        const snap = await getDoc(taskRef)

        if (!snap.exists()) { throw new Error('Task not found') }
        const taskData = snap.data()
        if (taskData.userId !== userId) { throw new Error('Unauthorized access to task') }

        if (updates.status === 'completed' && taskData.status !== 'completed') {
          updates.completedAt = new Date()
        } else if (updates.status !== 'completed' && taskData.status === 'completed') {
          updates.completedAt = undefined
        }

        const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() }
        if ('relatedProjects' in updates || 'projectId' in updates) {
          const normalizedRelatedProjects = Array.isArray(updates.relatedProjects)
            ? updates.relatedProjects.map(value => String(value))
            : updates.projectId != null
              ? [String(updates.projectId)]
              : Array.isArray(taskData.relatedProjects)
                ? taskData.relatedProjects.map((value: unknown) => String(value))
                : []
          const normalizedProjectId =
            updates.projectId != null
              ? String(updates.projectId)
              : normalizedRelatedProjects[0]
          updateData.relatedProjects = normalizedRelatedProjects
          if (normalizedProjectId) { updateData.projectId = normalizedProjectId }
        }
        for (const [key, value] of Object.entries(updates)) {
          if (key === 'id' || key === 'userId' || key === 'createdAt') { continue }
          if (key === 'relatedProjects' || key === 'projectId') { continue }
          if (value === undefined) { continue }
          updateData[key] = key === 'completedAt' && value instanceof Date ? Timestamp.fromDate(value) : value
        }

        await updateDoc(taskRef, updateData)

        const index = this.tasks.findIndex(t => t.id === id)
        if (index !== -1) { this.tasks[index] = { ...this.tasks[index], ...updates, updatedAt: new Date() } }
        if (this.currentTask?.id === id) { this.currentTask = { ...this.currentTask, ...updates, updatedAt: new Date() } }
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to update task'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error updating task:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async deleteTask (id: string) {
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('Not signed in')
      }

      this.loading = true
      this.error = null
      try {
        const taskRef = doc(getFirestore(), 'tasks', id)
        const snap = await getDoc(taskRef)
        if (!snap.exists()) { throw new Error('Task not found') }
        if (snap.data().userId !== userId) { throw new Error('Unauthorized access to task') }
        await deleteDoc(taskRef)
        this.tasks = this.tasks.filter(t => t.id !== id)
        if (this.currentTask?.id === id) { this.currentTask = null }
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to delete task'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error deleting task:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // ─── Comments ────────────────────────────────────────────────────────

    async addComment (taskId: string, content: string) {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      const task = this.getById(taskId)
      if (!task) { this.error = 'Task not found'; return }

      this.loading = true
      this.error = null
      try {
        const newComment: Comment = {
          id: crypto.randomUUID(),
          userId: authStore.user.id,
          content,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        const commentForTask = { id: newComment.id, userId: newComment.userId, text: content, createdAt: newComment.createdAt }
        const comments = task.comments ? [...task.comments, commentForTask] : [commentForTask]
        await this.updateTask(taskId, { comments })
        return newComment.id
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to add comment'
        useNotificationStore().error('An error occurred. Please try again.')
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateComment (taskId: string, commentId: string, content: string) {
      const task = this.getById(taskId)
      if (!task?.comments) { this.error = 'Task or comments not found'; return }

      const idx = task.comments.findIndex(c => c.id === commentId)
      if (idx === -1) { this.error = 'Comment not found'; return }

      this.loading = true
      this.error = null
      try {
        const updated = [...task.comments]
        updated[idx] = { id: updated[idx].id, userId: updated[idx].userId, text: content, createdAt: updated[idx].createdAt }
        await this.updateTask(taskId, { comments: updated })
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to update comment'
        useNotificationStore().error('An error occurred. Please try again.')
        throw err
      } finally {
        this.loading = false
      }
    },

    async deleteComment (taskId: string, commentId: string) {
      const task = this.getById(taskId)
      if (!task) { this.error = 'Task not found'; return }

      this.loading = true
      this.error = null
      try {
        const updated = (task.comments || []).filter(c => c.id !== commentId)
        await this.updateTask(taskId, { comments: updated })
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to delete comment'
        useNotificationStore().error('An error occurred. Please try again.')
        throw err
      } finally {
        this.loading = false
      }
    },

    // ─── Subtasks ────────────────────────────────────────────────────────

    async addSubtask (parentId: string, subtaskData: Partial<Task>) {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      const parent = this.getById(parentId)
      if (!parent) { this.error = 'Parent task not found'; return }

      this.loading = true
      this.error = null
      try {
        const subtaskId = await this.createTask({ ...subtaskData, parentTask: parentId })
        if (!subtaskId) { throw new Error('Failed to create subtask') }
        await this.updateTask(parentId, { subtasks: [...parent.subtasks, subtaskId] })
        return subtaskId
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to add subtask'
        useNotificationStore().error('An error occurred. Please try again.')
        throw err
      } finally {
        this.loading = false
      }
    },

    // ─── Status shortcuts ─────────────────────────────────────────────

    async markComplete (id: string) {
      return this.updateTask(id, { status: 'completed', completedAt: new Date() })
    },
    async markInProgress (id: string) {
      return this.updateTask(id, { status: 'inProgress', completedAt: undefined })
    },
    async markDelegated (id: string, assignedTo: string) {
      return this.updateTask(id, { status: 'delegated', assignedTo, type: 'delegation' })
    },

    setSubtaskParent (parentTask: Task) {
      this.subtaskParent = parentTask
    },

    // ─── Provider integration ─────────────────────────────────────────

    setIntegrationAccounts (accounts: IntegrationAccount[]) {
      this.integrationAccounts = filterTaskAccounts(accounts)
    },

    async fetchTasksFromProviders () {
      if (!this.integrationAccounts.length) { return }

      const authStore = useAuthStore()
      if (!authStore.user) { return }

      this.loading = true
      this.error = null
      try {
        this.syncedProviderTasks = await fetchProviderTasksParallel(this.integrationAccounts, authStore.user.id)
        await this.mergeProviderTasks()
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch tasks from providers'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error in fetchTasksFromProviders:', err)
      } finally {
        this.loading = false
      }
    },

    async mergeProviderTasks () {
      await mergeProviderTasksIntoFirestore(
        this.syncedProviderTasks,
        this.tasks,
        useAuthStore().user?.id || '',
        this.updateTask.bind(this)
      )
      await this.fetchTasks()
    },

    async createTaskWithProvider (task: Partial<Task>, accountId: string): Promise<string | undefined> {
      this.loading = true
      this.error = null
      try {
        return await createTaskViaProvider(task, accountId, this.integrationAccounts, this.createTask.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to create task with provider'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error in createTaskWithProvider:', err)
        return undefined
      } finally {
        this.loading = false
      }
    },

    async updateTaskWithProvider (id: string, updates: Partial<Task>): Promise<boolean> {
      this.loading = true
      this.error = null
      try {
        return await updateTaskViaProvider(id, updates, this.getById, this.integrationAccounts, this.updateTask.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to update task with provider'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error in updateTaskWithProvider:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    async deleteTaskWithProvider (id: string): Promise<boolean> {
      this.loading = true
      this.error = null
      try {
        return await deleteTaskViaProvider(id, this.getById, this.integrationAccounts, this.deleteTask.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to delete task with provider'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error in deleteTaskWithProvider:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    async completeTaskWithProvider (id: string): Promise<boolean> {
      this.loading = true
      this.error = null
      try {
        return await completeTaskViaProvider(id, this.getById, this.integrationAccounts, this.markComplete.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to complete task with provider'
        useNotificationStore().error('An error occurred. Please try again.')
        console.error('Error in completeTaskWithProvider:', err)
        return false
      } finally {
        this.loading = false
      }
    }
  }
})
