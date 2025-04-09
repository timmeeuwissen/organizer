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
import type { Task, Comment } from '~/types/models'

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    currentTask: null as Task | null,
    loading: false,
    error: null as string | null,
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
        text: newComment.content,
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
          ...updatedComments[commentIndex],
          content,
          updatedAt: new Date()
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
    }
  }
})
