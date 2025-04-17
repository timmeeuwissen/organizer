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
  Timestamp
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { createTasksProvider } from '~/utils/api/taskProviders'
import type { Task, Comment, IntegrationAccount } from '~/types/models'

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    currentTask: null as Task | null,
    loading: false,
    error: null as string | null,
    integrationAccounts: [] as IntegrationAccount[],
    syncedProviderTasks: {} as Record<string, Task[]>, // Tasks fetched from providers, keyed by account ID
    subtaskParent: null as Task | null, // For creating subtasks
  }),

  getters: {
    getById: (state) => (id: string) => {
      return state.tasks.find(task => task.id === id) || null
    },
    todoTasks: (state) => {
      return state.tasks.filter(task => task.status === 'todo')
    },
    inProgressTasks: (state) => {
      return state.tasks.filter(task => task.status === 'inProgress')
    },
    completedTasks: (state) => {
      return state.tasks.filter(task => task.status === 'completed')
    },
    delegatedTasks: (state) => {
      return state.tasks.filter(task => task.status === 'delegated')
    },
    cancelledTasks: (state) => {
      return state.tasks.filter(task => task.status === 'cancelled')
    },
    getByTag: (state) => (tag: string) => {
      return state.tasks.filter(task => task.tags.includes(tag))
    },
    getByAssignee: (state) => (assigneeId: string) => {
      return state.tasks.filter(task => task.assignedTo === assigneeId)
    },
    getByProject: (state) => (projectId: string) => {
      return state.tasks.filter(task => 
        task.relatedProjects && task.relatedProjects.includes(projectId)
      )
    },
    getByMeeting: (state) => (meetingId: string) => {
      return state.tasks.filter(task => 
        task.relatedMeetings && task.relatedMeetings.includes(meetingId)
      )
    },
    getByBehavior: (state) => (behaviorId: string) => {
      return state.tasks.filter(task => 
        task.relatedBehaviors && task.relatedBehaviors.includes(behaviorId)
      )
    },
    getByParent: (state) => (parentId: string) => {
      return state.tasks.filter(task => task.parentTask === parentId)
    },
    upcomingTasks: (state) => {
      const now = new Date()
      return state.tasks
        .filter(task => 
          (task.status === 'todo' || task.status === 'inProgress') && 
          task.dueDate && 
          task.dueDate > now
        )
        .sort((a, b) => {
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.getTime() - b.dueDate.getTime()
        })
    },
    overdueTasks: (state) => {
      const now = new Date()
      return state.tasks
        .filter(task => 
          (task.status === 'todo' || task.status === 'inProgress') && 
          task.dueDate && 
          task.dueDate < now
        )
        .sort((a, b) => {
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.getTime() - b.dueDate.getTime()
        })
    },
    getTags: (state) => {
      const tags = new Set<string>()
      state.tasks.forEach(task => {
        task.tags.forEach(tag => tags.add(tag))
      })
      return Array.from(tags)
    },
    getRoutineTasks: (state) => {
      return state.tasks.filter(task => task.type === 'routine')
    },
    getDelegationTasks: (state) => {
      return state.tasks.filter(task => task.type === 'delegation')
    },
    getFollowUpTasks: (state) => {
      return state.tasks.filter(task => task.type === 'followUp')
    }
  },

  actions: {
    async fetchTasks() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const tasksRef = collection(db, 'tasks')
        const q = query(
          tasksRef, 
          where('userId', '==', authStore.user.id),
          orderBy('dueDate', 'asc')
        )
        const querySnapshot = await getDocs(q)
        
        this.tasks = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            dueDate: data.dueDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate() || null,
            comments: (data.comments || []).map((comment: any) => ({
              ...comment,
              createdAt: comment.createdAt?.toDate() || new Date(),
              updatedAt: comment.updatedAt?.toDate() || new Date(),
            }))
          } as Task
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch tasks'
        console.error('Error fetching tasks:', error)
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
        const db = getFirestore()
        const taskRef = doc(db, 'tasks', id)
        const taskSnap = await getDoc(taskRef)
        
        if (taskSnap.exists()) {
          const data = taskSnap.data()
          
          // Ensure this task belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to task')
          }
          
          this.currentTask = {
            ...data,
            id: taskSnap.id,
            dueDate: data.dueDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate() || null,
            comments: (data.comments || []).map((comment: any) => ({
              ...comment,
              createdAt: comment.createdAt?.toDate() || new Date(),
              updatedAt: comment.updatedAt?.toDate() || new Date(),
            }))
          } as Task
        } else {
          this.error = 'Task not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch task'
        console.error('Error fetching task:', error)
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
        const db = getFirestore()
        const tasksRef = collection(db, 'tasks')
        
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
        
        const docRef = await addDoc(tasksRef, taskData)
        
        // Add the new task to the local state
        const addedTask = {
          ...taskData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          comments: []
        } as Task
        
        this.tasks.push(addedTask)
        this.currentTask = addedTask
        
        return docRef.id
      } catch (error: any) {
        this.error = error.message || 'Failed to create task'
        console.error('Error creating task:', error)
        throw error
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
        
        // First, get the task to verify ownership
        const taskSnap = await getDoc(taskRef)
        
        if (!taskSnap.exists()) {
          throw new Error('Task not found')
        }
        
        const taskData = taskSnap.data()
        
        // Ensure this task belongs to the current user
        if (taskData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to task')
        }
        
        // If status is being changed to completed, set completedAt
        if (updates.status === 'completed' && taskData.status !== 'completed') {
          updates.completedAt = new Date()
        } else if (updates.status !== 'completed' && taskData.status === 'completed') {
          updates.completedAt = undefined
        }
        
        // Prepare update data
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp(),
          completedAt: updates.completedAt 
            ? Timestamp.fromDate(updates.completedAt) 
            : updates.completedAt
        }
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id
        delete updateData.userId
        delete updateData.createdAt
        
        await updateDoc(taskRef, updateData)
        
        // Update local state
        const index = this.tasks.findIndex(t => t.id === id)
        if (index !== -1) {
          this.tasks[index] = {
            ...this.tasks[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        // Update current task if it's the one being edited
        if (this.currentTask && this.currentTask.id === id) {
          this.currentTask = {
            ...this.currentTask,
            ...updates,
            updatedAt: new Date(),
          }
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update task'
        console.error('Error updating task:', error)
        throw error
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
        const db = getFirestore()
        const taskRef = doc(db, 'tasks', id)
        
        // First, get the task to verify ownership
        const taskSnap = await getDoc(taskRef)
        
        if (!taskSnap.exists()) {
          throw new Error('Task not found')
        }
        
        const taskData = taskSnap.data()
        
        // Ensure this task belongs to the current user
        if (taskData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to task')
        }
        
        await deleteDoc(taskRef)
        
        // Update local state
        this.tasks = this.tasks.filter(t => t.id !== id)
        
        // Clear current task if it was the one deleted
        if (this.currentTask && this.currentTask.id === id) {
          this.currentTask = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete task'
        console.error('Error deleting task:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async addComment(taskId: string, content: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      const task = this.getById(taskId)
      if (!task) {
        this.error = 'Task not found'
        return
      }
      
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
      
      // Convert to the Task interface field 'text'
      const commentForTask = {
        id: newComment.id,
        userId: newComment.userId,
        text: content, // Use the content parameter directly
        createdAt: newComment.createdAt
      };
      
      const comments = task.comments ? [...task.comments, commentForTask] : [commentForTask]
        
        await this.updateTask(taskId, { comments })
        
        return newComment.id
      } catch (error: any) {
        this.error = error.message || 'Failed to add comment'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateComment(taskId: string, commentId: string, content: string) {
      const task = this.getById(taskId)
      if (!task) {
        this.error = 'Task not found'
        return
      }
      
      if (!task.comments) {
        this.error = 'Task has no comments'
        return
      }
      
      const commentIndex = task.comments.findIndex(c => c.id === commentId)
      if (commentIndex === -1) {
        this.error = 'Comment not found'
        return
      }
      
      this.loading = true
      this.error = null
      
      try {
        const updatedComments = [...task.comments]
        updatedComments[commentIndex] = {
          id: updatedComments[commentIndex].id,
          userId: updatedComments[commentIndex].userId,
          text: content, // Use text instead of content
          createdAt: updatedComments[commentIndex].createdAt
        }
        
        await this.updateTask(taskId, { comments: updatedComments })
      } catch (error: any) {
        this.error = error.message || 'Failed to update comment'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteComment(taskId: string, commentId: string) {
      const task = this.getById(taskId)
      if (!task) {
        this.error = 'Task not found'
        return
      }
      
      this.loading = true
      this.error = null
      
      try {
        if (!task.comments || task.comments.length === 0) {
        this.error = 'Task has no comments'
        return
      }
      
      const updatedComments = task.comments.filter(c => c.id !== commentId)
        
        await this.updateTask(taskId, { comments: updatedComments })
      } catch (error: any) {
        this.error = error.message || 'Failed to delete comment'
        throw error
      } finally {
        this.loading = false
      }
    },

    async addSubtask(parentId: string, subtaskData: Partial<Task>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      const parentTask = this.getById(parentId)
      if (!parentTask) {
        this.error = 'Parent task not found'
        return
      }
      
      this.loading = true
      this.error = null
      
      try {
        // Create the new subtask
        const subtaskId = await this.createTask({
          ...subtaskData,
          parentTask: parentId
        })
        
        if (!subtaskId) {
          throw new Error('Failed to create subtask')
        }
        
        // Update the parent task with the new subtask ID
        const updatedSubtasks = [...parentTask.subtasks, subtaskId]
        await this.updateTask(parentId, { subtasks: updatedSubtasks })
        
        return subtaskId
      } catch (error: any) {
        this.error = error.message || 'Failed to add subtask'
        throw error
      } finally {
        this.loading = false
      }
    },

    async markComplete(id: string) {
      return this.updateTask(id, { 
        status: 'completed', 
        completedAt: new Date() 
      })
    },

    async markInProgress(id: string) {
      return this.updateTask(id, { 
        status: 'inProgress', 
        completedAt: undefined 
      })
    },

    async markDelegated(id: string, assignedTo: string) {
      return this.updateTask(id, { 
        status: 'delegated', 
        assignedTo,
        type: 'delegation'
      })
    },

    // ======= Provider Integration Methods =======

    /**
     * Set the integration accounts to be used for task providers
     * @param accounts List of integration accounts
     */
    setIntegrationAccounts(accounts: IntegrationAccount[]) {
      this.integrationAccounts = accounts.filter(account => account.syncTasks)
    },

    /**
     * Fetch tasks from all enabled task providers
     */
    async fetchTasksFromProviders() {
      if (!this.integrationAccounts.length) return

      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        if (!authStore.user) return

        // Create a new synced provider tasks object
        const syncedTasks: Record<string, Task[]> = {}

        // Process each enabled account
        for (const account of this.integrationAccounts) {
          if (!account.syncTasks || !account.oauthData.connected) {
            console.log(`Skipping tasks sync for ${account.oauthData.email} (${account.type}) - sync disabled or not connected`)
            continue
          }

          try {
            // Create the appropriate provider
            const provider = createTasksProvider(account)
            
            // Check if provider is authenticated
            if (!provider.isAuthenticated()) {
              const authenticated = await provider.authenticate()
              if (!authenticated) {
                console.error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
                continue
              }
            }

            // Fetch tasks from the provider
            const result = await provider.fetchTasks()
            
            // Add userId to each task and store in syncedTasks
              // Ensure all required Task fields are present
              const tasks = result.tasks.map((task: Partial<Task>) => ({
                ...task,
                userId: authStore.user!.id,
                id: task.id || crypto.randomUUID(), // Ensure ID is present
                providerId: task.id, // Store the provider's task ID
                providerAccountId: account.id, // Store the account ID
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
                comments: task.comments || []
              })) as Task[]

            syncedTasks[account.id] = tasks
            console.log(`Fetched ${tasks.length} tasks from ${account.type} (${account.oauthData.email})`)
          } catch (error) {
            console.error(`Error fetching tasks from ${account.type} for ${account.oauthData.email}:`, error)
            // Continue with other accounts even if one fails
          }
        }

        // Update the synced tasks state
        this.syncedProviderTasks = syncedTasks

        // Merge provider tasks with local tasks
        await this.mergeProviderTasks()
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch tasks from providers'
        console.error('Error in fetchTasksFromProviders:', error)
      } finally {
        this.loading = false
      }
    },

    /**
     * Merge provider tasks with local tasks
     * This performs a sync between local Firestore tasks and provider tasks
     */
    async mergeProviderTasks() {
      if (!Object.keys(this.syncedProviderTasks).length) return

      try {
        const authStore = useAuthStore()
        if (!authStore.user) return

        const db = getFirestore()
        const tasksRef = collection(db, 'tasks')
        
        // Get all the synced tasks flattened into a single array
        const allSyncedTasks: Task[] = Object.values(this.syncedProviderTasks).flat()
        
        // Find tasks that need to be created in Firestore (don't exist locally)
        for (const task of allSyncedTasks) {
          // Check if this task already exists in the local state by providerId and providerAccountId
          const existingTaskIndex = this.tasks.findIndex(t => 
            t.providerId === task.providerId && 
            t.providerAccountId === task.providerAccountId
          )

          if (existingTaskIndex === -1) {
            // Task doesn't exist locally, add it to Firestore
            // Clean up any undefined fields that might cause Firestore errors
            const taskData = {
              ...task,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              // Handle completedDate/completedAt - ensure it's either a valid Timestamp or null (not undefined)
              completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : null,
              completedDate: null // Explicitly set completedDate to null to avoid the undefined error
            }
            
            // Remove any undefined fields to prevent Firestore errors
            // Use type assertion to handle dynamic properties
            Object.keys(taskData).forEach(key => {
              const typedTaskData = taskData as any;
              if (typedTaskData[key] === undefined) {
                typedTaskData[key] = null;
              }
            });
            
            // Add to Firestore
            await addDoc(tasksRef, taskData)
          } else {
            // Task exists locally, check if it needs updating
            const existingTask = this.tasks[existingTaskIndex]
            
            // Only update if provider version is newer or status has changed
            if (
              (task.providerUpdatedAt && (!existingTask.providerUpdatedAt || 
                task.providerUpdatedAt > existingTask.providerUpdatedAt)) ||
              task.status !== existingTask.status
            ) {
              // Update the local task with provider data
              await this.updateTask(existingTask.id, {
                ...task,
                providerUpdatedAt: new Date()
              })
            }
          }
        }

        // Refresh local tasks after all the changes
        await this.fetchTasks()
      } catch (error) {
        console.error('Error merging provider tasks:', error)
      }
    },

    /**
     * Create a task using a specific provider
     * @param task Task data to create
     * @param accountId ID of the integration account to use
     */
    async createTaskWithProvider(task: Partial<Task>, accountId: string): Promise<string | undefined> {
      this.loading = true
      this.error = null

      try {
        const account = this.integrationAccounts.find(a => a.id === accountId)
        if (!account) {
          throw new Error(`Account ${accountId} not found`)
        }

        // Create the appropriate provider
        const provider = createTasksProvider(account)
        
        // Check if provider is authenticated
        if (!provider.isAuthenticated()) {
          const authenticated = await provider.authenticate()
          if (!authenticated) {
            throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
          }
        }

        // Create the task in the provider
        const result = await provider.createTask(task)
        
        if (!result.success || !result.taskId) {
          throw new Error('Failed to create task in provider')
        }

        // Store the provider ID and create the task in Firestore
        const taskWithProviderId = {
          ...task,
          providerId: result.taskId,
          providerAccountId: accountId,
          providerUpdatedAt: new Date()
        }

        // Create in local storage
        const firestoreId = await this.createTask(taskWithProviderId)
        return firestoreId
      } catch (error: any) {
        this.error = error.message || 'Failed to create task with provider'
        console.error('Error in createTaskWithProvider:', error)
        return undefined
      } finally {
        this.loading = false
      }
    },

    /**
     * Update a task using its provider
     * @param id Local Firestore ID of the task
     * @param updates Changes to apply to the task
     */
    async updateTaskWithProvider(id: string, updates: Partial<Task>): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const task = this.getById(id)
        if (!task) {
          throw new Error('Task not found')
        }

        // Check if this is a provider-synced task
        if (!task.providerId || !task.providerAccountId) {
          throw new Error('This task is not linked to a provider')
        }

        const account = this.integrationAccounts.find(a => a.id === task.providerAccountId)
        if (!account) {
          throw new Error(`Provider account ${task.providerAccountId} not found`)
        }

        // Create the appropriate provider
        const provider = createTasksProvider(account)
        
        // Check if provider is authenticated
        if (!provider.isAuthenticated()) {
          const authenticated = await provider.authenticate()
          if (!authenticated) {
            throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
          }
        }

        // Update the task in the provider
        const success = await provider.updateTask(task.providerId, updates)
        
        if (!success) {
          throw new Error('Failed to update task in provider')
        }

        // Update the task in Firestore with providerUpdatedAt
        await this.updateTask(id, {
          ...updates,
          providerUpdatedAt: new Date()
        })

        return true
      } catch (error: any) {
        this.error = error.message || 'Failed to update task with provider'
        console.error('Error in updateTaskWithProvider:', error)
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete a task using its provider
     * @param id Local Firestore ID of the task
     */
    async deleteTaskWithProvider(id: string): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const task = this.getById(id)
        if (!task) {
          throw new Error('Task not found')
        }

        // Check if this is a provider-synced task
        if (!task.providerId || !task.providerAccountId) {
          throw new Error('This task is not linked to a provider')
        }

        const account = this.integrationAccounts.find(a => a.id === task.providerAccountId)
        if (!account) {
          throw new Error(`Provider account ${task.providerAccountId} not found`)
        }

        // Create the appropriate provider
        const provider = createTasksProvider(account)
        
        // Check if provider is authenticated
        if (!provider.isAuthenticated()) {
          const authenticated = await provider.authenticate()
          if (!authenticated) {
            throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
          }
        }

        // Delete the task in the provider
        const success = await provider.deleteTask(task.providerId)
        
        if (!success) {
          throw new Error('Failed to delete task in provider')
        }

        // Delete the task in Firestore
        await this.deleteTask(id)

        return true
      } catch (error: any) {
        this.error = error.message || 'Failed to delete task with provider'
        console.error('Error in deleteTaskWithProvider:', error)
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Set a task as the parent for a new subtask
     * @param parentTask The parent task
     */
    setSubtaskParent(parentTask: Task) {
      this.subtaskParent = parentTask
    },

    /**
     * Mark a task as complete using its provider
     * @param id Local Firestore ID of the task
     */
    async completeTaskWithProvider(id: string): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const task = this.getById(id)
        if (!task) {
          throw new Error('Task not found')
        }

        // Check if this is a provider-synced task
        if (!task.providerId || !task.providerAccountId) {
          throw new Error('This task is not linked to a provider')
        }

        const account = this.integrationAccounts.find(a => a.id === task.providerAccountId)
        if (!account) {
          throw new Error(`Provider account ${task.providerAccountId} not found`)
        }

        // Create the appropriate provider
        const provider = createTasksProvider(account)
        
        // Check if provider is authenticated
        if (!provider.isAuthenticated()) {
          const authenticated = await provider.authenticate()
          if (!authenticated) {
            throw new Error(`Failed to authenticate with ${account.type} for ${account.oauthData.email}`)
          }
        }

        // Complete the task in the provider
        const success = await provider.completeTask(task.providerId)
        
        if (!success) {
          throw new Error('Failed to complete task in provider')
        }

        // Mark the task as complete in Firestore
        await this.markComplete(id)

        return true
      } catch (error: any) {
        this.error = error.message || 'Failed to complete task with provider'
        console.error('Error in completeTaskWithProvider:', error)
        return false
      } finally {
        this.loading = false
      }
    }
  }
})
