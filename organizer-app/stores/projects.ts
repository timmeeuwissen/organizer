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
      // Convert string priorities to numeric values for sorting
      const priorityValue = (p: 'low' | 'medium' | 'high' | 'urgent' | number): number => {
        if (typeof p === 'number') return p;
        switch(p) {
          case 'low': return 1;
          case 'medium': return 2;
          case 'high': return 3;
          case 'urgent': return 4;
          default: return 0;
        }
      };
      return [...state.projects].sort((a, b) => priorityValue(a.priority) - priorityValue(b.priority));
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
        
        // Create a clean object without undefined values, as Firebase doesn't accept undefined
        const projectData = {
          ...Object.fromEntries(
            Object.entries(newProject).filter(([_, v]) => v !== undefined)
          ),
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
        
        // Filter out undefined values from the updates object
        const filteredUpdates: Partial<Project> = {};
        
        // Copy only defined values
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            // Using type assertion to bypass TypeScript's index signature restriction
            (filteredUpdates as any)[key] = value;
          }
        });
        
        // Add server timestamp
        const updateData = {
          ...filteredUpdates,
          updatedAt: serverTimestamp(),
        };
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id;
        delete updateData.userId;
        delete updateData.createdAt;
        
        // Handle dueDate - convert undefined to undefined (so it's not included in the update)
        // Let Firebase handle the case where dueDate is explicitly set to null
        if (updates.dueDate === undefined) {
          delete updateData.dueDate;
        }
        
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
    
    // Helper to ensure type safety when converting stored priority values
    getPriorityValue(priority: any): 'low' | 'medium' | 'high' | 'urgent' {
      if (typeof priority === 'string' && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return priority as 'low' | 'medium' | 'high' | 'urgent';
      }
      
      // Legacy numeric priority conversion
      if (typeof priority === 'number') {
        if (priority <= 3) return 'low';
        if (priority <= 6) return 'medium';
        if (priority <= 8) return 'high';
        return 'urgent';
      }
      
      // Default
      return 'medium';
    },

    async updatePriority(id: string, priority: 'low' | 'medium' | 'high' | 'urgent') {
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
