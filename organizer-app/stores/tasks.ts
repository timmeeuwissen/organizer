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
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuthStore } from './auth'
import {
  filterTaskAccounts,
  fetchProviderTasksParallel,
  mergeProviderTasksIntoFirestore,
  createTaskViaProvider,
  updateTaskViaProvider,
  deleteTaskViaProvider,
  completeTaskViaProvider,
} from './tasks/providerSync'
import type { Task, Comment, IntegrationAccount } from '~/types/models'

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    currentTask: null as Task | null,
    loading: false,
    error: null as string | null,
    integrationAccounts: [] as IntegrationAccount[],
    syncedProviderTasks: {} as Record<string, Task[]>,
    subtaskParent: null as Task | null,
  }),

  getters: {
    getById: (state) => (id: string) => state.tasks.find((t) => t.id === id) || null,

    todoTasks: (state) => state.tasks.filter((t) => t.status === 'todo'),
    inProgressTasks: (state) => state.tasks.filter((t) => t.status === 'inProgress'),
    completedTasks: (state) => state.tasks.filter((t) => t.status === 'completed'),
    delegatedTasks: (state) => state.tasks.filter((t) => t.status === 'delegated'),
    cancelledTasks: (state) => state.tasks.filter((t) => t.status === 'cancelled'),

    getByTag: (state) => (tag: string) => state.tasks.filter((t) => t.tags.includes(tag)),
    getByAssignee: (state) => (id: string) => state.tasks.filter((t) => t.assignedTo === id),
    getByProject: (state) => (id: string) => state.tasks.filter((t) => t.relatedProjects?.includes(id)),
    getByMeeting: (state) => (id: string) => state.tasks.filter((t) => t.relatedMeetings?.includes(id)),
    getByBehavior: (state) => (id: string) => state.tasks.filter((t) => t.relatedBehaviors?.includes(id)),
    getByParent: (state) => (id: string) => state.tasks.filter((t) => t.parentTask === id),

    upcomingTasks: (state) => {
      const nowMs = Date.now()
      const active = state.tasks.filter(
        (t) => (t.status === 'todo' || t.status === 'inProgress') && t.dueDate && t.dueDate.getTime() > nowMs
      )
      active.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
      return active
    },

    overdueTasks: (state) => {
      const nowMs = Date.now()
      const overdue = state.tasks.filter(
        (t) => (t.status === 'todo' || t.status === 'inProgress') && t.dueDate && t.dueDate.getTime() < nowMs
      )
      overdue.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
      return overdue
    },

    getTags: (state) => {
      const seen = new Set<string>()
      for (const task of state.tasks) for (const tag of task.tags) seen.add(tag)
      return Array.from(seen)
    },

    getRoutineTasks: (state) => state.tasks.filter((t) => t.type === 'routine'),
    getDelegationTasks: (state) => state.tasks.filter((t) => t.type === 'delegation'),
    getFollowUpTasks: (state) => state.tasks.filter((t) => t.type === 'followUp'),
  },

  actions: {
    // ─── Firestore CRUD ──────────────────────────────────────────────────

    async fetchTasks() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      try {
        const db = getFirestore()
        const snap = await getDocs(
          query(collection(db, 'tasks'), where('userId', '==', authStore.user.id), orderBy('dueDate', 'asc'))
        )
        this.tasks = snap.docs.map((d) => {
          const data = d.data()
          return {
            ...data,
            id: d.id,
            dueDate: data.dueDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate() || null,
            comments: (data.comments || []).map((c: Record<string, unknown>) => ({
              ...c,
              createdAt: (c.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
              updatedAt: (c.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
            })),
          } as Task
        })
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch tasks'
        console.error('Error fetching tasks:', err)
      } finally {
        this.loading = false
      }
    },

    async fetchTask(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      try {
        const snap = await getDoc(doc(getFirestore(), 'tasks', id))
        if (!snap.exists()) { this.error = 'Task not found'; return }

        const data = snap.data()
        if (data.userId !== authStore.user.id) throw new Error('Unauthorized access to task')

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
            updatedAt: (c.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
          })),
        } as Task
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch task'
        console.error('Error fetching task:', err)
      } finally {
        this.loading = false
      }
    },

    async createTask(newTask: Partial<Task>) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      try {
        const taskData = {
          ...newTask,
          userId: authStore.user.id,
          tags: newTask.tags || [],
          subtasks: newTask.subtasks || [],
          comments: newTask.comments || [],
          relatedProjects: newTask.relatedProjects || [],
          relatedMeetings: newTask.relatedMeetings || [],
          relatedBehaviors: newTask.relatedBehaviors || [],
          status: newTask.status || 'todo',
          type: newTask.type || 'task',
          priority: newTask.priority || 3,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        const docRef = await addDoc(collection(getFirestore(), 'tasks'), taskData)
        const added = { ...taskData, id: docRef.id, createdAt: new Date(), updatedAt: new Date(), comments: [] } as Task
        this.tasks.push(added)
        this.currentTask = added
        return docRef.id
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to create task'
        console.error('Error creating task:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateTask(id: string, updates: Partial<Task>) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      try {
        const db = getFirestore()
        const taskRef = doc(db, 'tasks', id)
        const snap = await getDoc(taskRef)

        if (!snap.exists()) throw new Error('Task not found')
        const taskData = snap.data()
        if (taskData.userId !== authStore.user.id) throw new Error('Unauthorized access to task')

        if (updates.status === 'completed' && taskData.status !== 'completed') {
          updates.completedAt = new Date()
        } else if (updates.status !== 'completed' && taskData.status === 'completed') {
          updates.completedAt = undefined
        }

        const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() }
        for (const [key, value] of Object.entries(updates)) {
          if (key === 'id' || key === 'userId' || key === 'createdAt') continue
          updateData[key] = key === 'completedAt' && value instanceof Date ? Timestamp.fromDate(value) : value
        }

        await updateDoc(taskRef, updateData)

        const index = this.tasks.findIndex((t) => t.id === id)
        if (index !== -1) this.tasks[index] = { ...this.tasks[index], ...updates, updatedAt: new Date() }
        if (this.currentTask?.id === id) this.currentTask = { ...this.currentTask, ...updates, updatedAt: new Date() }
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to update task'
        console.error('Error updating task:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async deleteTask(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      try {
        const taskRef = doc(getFirestore(), 'tasks', id)
        const snap = await getDoc(taskRef)
        if (!snap.exists()) throw new Error('Task not found')
        if (snap.data().userId !== authStore.user.id) throw new Error('Unauthorized access to task')
        await deleteDoc(taskRef)
        this.tasks = this.tasks.filter((t) => t.id !== id)
        if (this.currentTask?.id === id) this.currentTask = null
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to delete task'
        console.error('Error deleting task:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // ─── Comments ────────────────────────────────────────────────────────

    async addComment(taskId: string, content: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return

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
          updatedAt: new Date(),
        }
        const commentForTask = { id: newComment.id, userId: newComment.userId, text: content, createdAt: newComment.createdAt }
        const comments = task.comments ? [...task.comments, commentForTask] : [commentForTask]
        await this.updateTask(taskId, { comments })
        return newComment.id
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to add comment'
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateComment(taskId: string, commentId: string, content: string) {
      const task = this.getById(taskId)
      if (!task?.comments) { this.error = 'Task or comments not found'; return }

      const idx = task.comments.findIndex((c) => c.id === commentId)
      if (idx === -1) { this.error = 'Comment not found'; return }

      this.loading = true
      this.error = null
      try {
        const updated = [...task.comments]
        updated[idx] = { id: updated[idx].id, userId: updated[idx].userId, text: content, createdAt: updated[idx].createdAt }
        await this.updateTask(taskId, { comments: updated })
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to update comment'
        throw err
      } finally {
        this.loading = false
      }
    },

    async deleteComment(taskId: string, commentId: string) {
      const task = this.getById(taskId)
      if (!task) { this.error = 'Task not found'; return }

      this.loading = true
      this.error = null
      try {
        const updated = (task.comments || []).filter((c) => c.id !== commentId)
        await this.updateTask(taskId, { comments: updated })
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to delete comment'
        throw err
      } finally {
        this.loading = false
      }
    },

    // ─── Subtasks ────────────────────────────────────────────────────────

    async addSubtask(parentId: string, subtaskData: Partial<Task>) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      const parent = this.getById(parentId)
      if (!parent) { this.error = 'Parent task not found'; return }

      this.loading = true
      this.error = null
      try {
        const subtaskId = await this.createTask({ ...subtaskData, parentTask: parentId })
        if (!subtaskId) throw new Error('Failed to create subtask')
        await this.updateTask(parentId, { subtasks: [...parent.subtasks, subtaskId] })
        return subtaskId
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to add subtask'
        throw err
      } finally {
        this.loading = false
      }
    },

    // ─── Status shortcuts ─────────────────────────────────────────────

    async markComplete(id: string) {
      return this.updateTask(id, { status: 'completed', completedAt: new Date() })
    },
    async markInProgress(id: string) {
      return this.updateTask(id, { status: 'inProgress', completedAt: undefined })
    },
    async markDelegated(id: string, assignedTo: string) {
      return this.updateTask(id, { status: 'delegated', assignedTo, type: 'delegation' })
    },

    setSubtaskParent(parentTask: Task) {
      this.subtaskParent = parentTask
    },

    // ─── Provider integration ─────────────────────────────────────────

    setIntegrationAccounts(accounts: IntegrationAccount[]) {
      this.integrationAccounts = filterTaskAccounts(accounts)
    },

    async fetchTasksFromProviders() {
      if (!this.integrationAccounts.length) return

      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      try {
        this.syncedProviderTasks = await fetchProviderTasksParallel(this.integrationAccounts, authStore.user.id)
        await this.mergeProviderTasks()
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch tasks from providers'
        console.error('Error in fetchTasksFromProviders:', err)
      } finally {
        this.loading = false
      }
    },

    async mergeProviderTasks() {
      await mergeProviderTasksIntoFirestore(
        this.syncedProviderTasks,
        this.tasks,
        useAuthStore().user?.id || '',
        this.updateTask.bind(this)
      )
      await this.fetchTasks()
    },

    async createTaskWithProvider(task: Partial<Task>, accountId: string): Promise<string | undefined> {
      this.loading = true
      this.error = null
      try {
        return await createTaskViaProvider(task, accountId, this.integrationAccounts, this.createTask.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to create task with provider'
        console.error('Error in createTaskWithProvider:', err)
        return undefined
      } finally {
        this.loading = false
      }
    },

    async updateTaskWithProvider(id: string, updates: Partial<Task>): Promise<boolean> {
      this.loading = true
      this.error = null
      try {
        return await updateTaskViaProvider(id, updates, this.getById, this.integrationAccounts, this.updateTask.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to update task with provider'
        console.error('Error in updateTaskWithProvider:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    async deleteTaskWithProvider(id: string): Promise<boolean> {
      this.loading = true
      this.error = null
      try {
        return await deleteTaskViaProvider(id, this.getById, this.integrationAccounts, this.deleteTask.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to delete task with provider'
        console.error('Error in deleteTaskWithProvider:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    async completeTaskWithProvider(id: string): Promise<boolean> {
      this.loading = true
      this.error = null
      try {
        return await completeTaskViaProvider(id, this.getById, this.integrationAccounts, this.markComplete.bind(this))
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Failed to complete task with provider'
        console.error('Error in completeTaskWithProvider:', err)
        return false
      } finally {
        this.loading = false
      }
    },
  },
})
