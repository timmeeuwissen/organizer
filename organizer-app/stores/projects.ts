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
  orderBy
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuthStore } from './auth'
import type { Project, ProjectPage } from '~/types/models'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [] as Project[],
    currentProject: null as Project | null,
    currentProjectPage: null as ProjectPage | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getById: (state) => (id: string) => {
      return state.projects.find(project => project.id === id) || null
    },
    activeProjects: (state) => {
      return state.projects.filter(p => p.status === 'active')
    },
    planningProjects: (state) => {
      return state.projects.filter(p => p.status === 'planning')
    },
    completedProjects: (state) => {
      return state.projects.filter(p => p.status === 'completed')
    },
    onHoldProjects: (state) => {
      return state.projects.filter(p => p.status === 'onHold')
    },
    cancelledProjects: (state) => {
      return state.projects.filter(p => p.status === 'cancelled')
    },
    getByTag: (state) => (tag: string) => {
      return state.projects.filter(project => project.tags.includes(tag))
    },
    getByMember: (state) => (memberId: string) => {
      return state.projects.filter(project => project.members.includes(memberId))
    },
    getSortedByPriority: (state) => {
      return [...state.projects].sort((a, b) => a.priority - b.priority)
    },
    getTags: (state) => {
      const tags = new Set<string>()
      state.projects.forEach(project => {
        project.tags.forEach(tag => tags.add(tag))
      })
      return Array.from(tags)
    }
  },

  actions: {
    async fetchProjects() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const projectsRef = collection(db, 'projects')
        const q = query(
          projectsRef, 
          where('userId', '==', authStore.user.id),
          orderBy('priority')
        )
        const querySnapshot = await getDocs(q)
        
        this.projects = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            dueDate: data.dueDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Project
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch projects'
        console.error('Error fetching projects:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchProject(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const projectRef = doc(db, 'projects', id)
        const projectSnap = await getDoc(projectRef)
        
        if (projectSnap.exists()) {
          const data = projectSnap.data()
          
          // Ensure this project belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to project')
          }
          
          this.currentProject = {
            ...data,
            id: projectSnap.id,
            dueDate: data.dueDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Project
        } else {
          this.error = 'Project not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch project'
        console.error('Error fetching project:', error)
      } finally {
        this.loading = false
      }
    },

    async createProject(newProject: Partial<Project>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const projectsRef = collection(db, 'projects')
        
        const projectData = {
          ...newProject,
          userId: authStore.user.id,
          members: newProject.members || [],
          tags: newProject.tags || [],
          tasks: newProject.tasks || [],
          pages: newProject.pages || [],
          meetings: newProject.meetings || [],
          progress: newProject.progress || 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        const docRef = await addDoc(projectsRef, projectData)
        
        // Add the new project to the local state
        const addedProject = {
          ...projectData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Project
        
        this.projects.push(addedProject)
        this.currentProject = addedProject
        
        return docRef.id
      } catch (error: any) {
        this.error = error.message || 'Failed to create project'
        console.error('Error creating project:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateProject(id: string, updates: Partial<Project>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const projectRef = doc(db, 'projects', id)
        
        // First, get the project to verify ownership
        const projectSnap = await getDoc(projectRef)
        
        if (!projectSnap.exists()) {
          throw new Error('Project not found')
        }
        
        const projectData = projectSnap.data()
        
        // Ensure this project belongs to the current user
        if (projectData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to project')
        }
        
        // Prepare update data
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp(),
        }
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id
        delete updateData.userId
        delete updateData.createdAt
        
        await updateDoc(projectRef, updateData)
        
        // Update local state
        const index = this.projects.findIndex(p => p.id === id)
        if (index !== -1) {
          this.projects[index] = {
            ...this.projects[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        // Update current project if it's the one being edited
        if (this.currentProject && this.currentProject.id === id) {
          this.currentProject = {
            ...this.currentProject,
            ...updates,
            updatedAt: new Date(),
          }
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update project'
        console.error('Error updating project:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteProject(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const projectRef = doc(db, 'projects', id)
        
        // First, get the project to verify ownership
        const projectSnap = await getDoc(projectRef)
        
        if (!projectSnap.exists()) {
          throw new Error('Project not found')
        }
        
        const projectData = projectSnap.data()
        
        // Ensure this project belongs to the current user
        if (projectData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to project')
        }
        
        await deleteDoc(projectRef)
        
        // Update local state
        this.projects = this.projects.filter(p => p.id !== id)
        
        // Clear current project if it was the one deleted
        if (this.currentProject && this.currentProject.id === id) {
          this.currentProject = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete project'
        console.error('Error deleting project:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateProgress(id: string, progress: number) {
      if (progress < 0 || progress > 100) {
        this.error = 'Progress must be between 0 and 100'
        return
      }
      
      return this.updateProject(id, { progress })
    },

    async updatePriority(id: string, priority: number) {
      return this.updateProject(id, { priority })
    },

    // Project Page methods
    async fetchProjectPages(projectId: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const pagesRef = collection(db, 'projectPages')
        const q = query(pagesRef, where('projectId', '==', projectId))
        const querySnapshot = await getDocs(q)
        
        const pages = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as ProjectPage
        })
        
        // Attach pages to the current project
        const project = this.getById(projectId)
        if (project) {
          project.pages = pages.map(page => page.id)
          
          // Also update the current project if it's the same one
          if (this.currentProject && this.currentProject.id === projectId) {
            this.currentProject.pages = project.pages
          }
        }
        
        return pages
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch project pages'
        console.error('Error fetching project pages:', error)
      } finally {
        this.loading = false
      }
    },
    
    async createProjectPage(projectId: string, newPage: Partial<ProjectPage>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        // First make sure the project exists and belongs to the user
        const project = this.getById(projectId)
        if (!project) {
          throw new Error('Project not found')
        }
        
        const db = getFirestore()
        const pagesRef = collection(db, 'projectPages')
        
        const pageData = {
          ...newPage,
          projectId,
          tags: newPage.tags || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        const docRef = await addDoc(pagesRef, pageData)
        
        // Add the page ID to the project
        const updatedPages = [...project.pages, docRef.id]
        await this.updateProject(projectId, { pages: updatedPages })
        
        // Create page object for return
        const addedPage = {
          ...pageData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ProjectPage
        
        return addedPage
      } catch (error: any) {
        this.error = error.message || 'Failed to create project page'
        console.error('Error creating project page:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchProjectPage(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const pageRef = doc(db, 'projectPages', id)
        const pageSnap = await getDoc(pageRef)
        
        if (pageSnap.exists()) {
          const data = pageSnap.data()
          
          // Make sure the associated project belongs to the user
          const project = this.getById(data.projectId)
          if (!project) {
            throw new Error('Associated project not found')
          }
          
          this.currentProjectPage = {
            ...data,
            id: pageSnap.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as ProjectPage
          
          return this.currentProjectPage
        } else {
          this.error = 'Project page not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch project page'
        console.error('Error fetching project page:', error)
      } finally {
        this.loading = false
      }
    },
    
    async updateProjectPage(id: string, updates: Partial<ProjectPage>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const pageRef = doc(db, 'projectPages', id)
        
        // First, get the page to verify project ownership
        const pageSnap = await getDoc(pageRef)
        
        if (!pageSnap.exists()) {
          throw new Error('Project page not found')
        }
        
        const pageData = pageSnap.data()
        
        // Ensure the associated project belongs to the current user
        const project = this.getById(pageData.projectId)
        if (!project) {
          throw new Error('Associated project not found')
        }
        
        // Prepare update data
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp(),
        }
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id
        delete updateData.projectId
        delete updateData.createdAt
        
        await updateDoc(pageRef, updateData)
        
        // Update current page if it's the one being edited
        if (this.currentProjectPage && this.currentProjectPage.id === id) {
          this.currentProjectPage = {
            ...this.currentProjectPage,
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        return this.currentProjectPage
      } catch (error: any) {
        this.error = error.message || 'Failed to update project page'
        console.error('Error updating project page:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteProjectPage(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const pageRef = doc(db, 'projectPages', id)
        
        // First, get the page to verify project ownership
        const pageSnap = await getDoc(pageRef)
        
        if (!pageSnap.exists()) {
          throw new Error('Project page not found')
        }
        
        const pageData = pageSnap.data()
        
        // Ensure the associated project belongs to the current user
        const project = this.getById(pageData.projectId)
        if (!project) {
          throw new Error('Associated project not found')
        }
        
        await deleteDoc(pageRef)
        
        // Remove page ID from the project
        const updatedPages = project.pages.filter(pageId => pageId !== id)
        await this.updateProject(project.id, { pages: updatedPages })
        
        // Clear current page if it was the one deleted
        if (this.currentProjectPage && this.currentProjectPage.id === id) {
          this.currentProjectPage = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete project page'
        console.error('Error deleting project page:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
