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
  serverTimestamp
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuthStore } from './auth'
import type { Behavior, ActionPlan } from '~/types/models'

export const useBehaviorsStore = defineStore('behaviors', {
  state: () => ({
    behaviors: [] as Behavior[],
    currentBehavior: null as Behavior | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getBehaviorsByType: (state) => (type: 'doWell' | 'wantToDoBetter' | 'needToImprove') => {
      return state.behaviors.filter(behavior => behavior.type === type)
    },
    getById: (state) => (id: string) => {
      return state.behaviors.find(behavior => behavior.id === id) || null
    }
  },

  actions: {
    async fetchBehaviors() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const behaviorsRef = collection(db, 'behaviors')
        const q = query(behaviorsRef, where('userId', '==', authStore.user.id))
        const querySnapshot = await getDocs(q)
        
        this.behaviors = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Behavior
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch behaviors'
        console.error('Error fetching behaviors:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchBehavior(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const behaviorRef = doc(db, 'behaviors', id)
        const behaviorSnap = await getDoc(behaviorRef)
        
        if (behaviorSnap.exists()) {
          const data = behaviorSnap.data()
          
          // Ensure this behavior belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to behavior')
          }
          
          this.currentBehavior = {
            ...data,
            id: behaviorSnap.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Behavior
        } else {
          this.error = 'Behavior not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch behavior'
        console.error('Error fetching behavior:', error)
      } finally {
        this.loading = false
      }
    },

    async createBehavior(newBehavior: Partial<Behavior>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const behaviorsRef = collection(db, 'behaviors')
        
        const behaviorData = {
          ...newBehavior,
          userId: authStore.user.id,
          examples: newBehavior.examples || [],
          categories: newBehavior.categories || [],
          actionPlans: newBehavior.actionPlans || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        const docRef = await addDoc(behaviorsRef, behaviorData)
        
        // Add the new behavior to the local state
        const addedBehavior = {
          ...behaviorData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Behavior
        
        this.behaviors.push(addedBehavior)
        this.currentBehavior = addedBehavior
        
        return docRef.id
      } catch (error: any) {
        this.error = error.message || 'Failed to create behavior'
        console.error('Error creating behavior:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateBehavior(id: string, updates: Partial<Behavior>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const behaviorRef = doc(db, 'behaviors', id)
        
        // First, get the behavior to verify ownership
        const behaviorSnap = await getDoc(behaviorRef)
        
        if (!behaviorSnap.exists()) {
          throw new Error('Behavior not found')
        }
        
        const behaviorData = behaviorSnap.data()
        
        // Ensure this behavior belongs to the current user
        if (behaviorData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to behavior')
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
        
        await updateDoc(behaviorRef, updateData)
        
        // Update local state
        const index = this.behaviors.findIndex(b => b.id === id)
        if (index !== -1) {
          this.behaviors[index] = {
            ...this.behaviors[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        // Update current behavior if it's the one being edited
        if (this.currentBehavior && this.currentBehavior.id === id) {
          this.currentBehavior = {
            ...this.currentBehavior,
            ...updates,
            updatedAt: new Date(),
          }
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update behavior'
        console.error('Error updating behavior:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteBehavior(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const behaviorRef = doc(db, 'behaviors', id)
        
        // First, get the behavior to verify ownership
        const behaviorSnap = await getDoc(behaviorRef)
        
        if (!behaviorSnap.exists()) {
          throw new Error('Behavior not found')
        }
        
        const behaviorData = behaviorSnap.data()
        
        // Ensure this behavior belongs to the current user
        if (behaviorData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to behavior')
        }
        
        await deleteDoc(behaviorRef)
        
        // Update local state
        this.behaviors = this.behaviors.filter(b => b.id !== id)
        
        // Clear current behavior if it was the one deleted
        if (this.currentBehavior && this.currentBehavior.id === id) {
          this.currentBehavior = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete behavior'
        console.error('Error deleting behavior:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async addActionPlan(behaviorId: string, actionPlan: Partial<ActionPlan>) {
      const behavior = this.getById(behaviorId)
      if (!behavior) {
        this.error = 'Behavior not found'
        return
      }
      
      const newActionPlan: ActionPlan = {
        id: crypto.randomUUID(),
        description: actionPlan.description || '',
        dueDate: actionPlan.dueDate,
        status: actionPlan.status || 'pending',
        tasks: actionPlan.tasks || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      const actionPlans = [...(behavior.actionPlans || []), newActionPlan]
      
      await this.updateBehavior(behaviorId, { actionPlans })
      
      return newActionPlan.id
    },

    async updateActionPlan(behaviorId: string, actionPlanId: string, updates: Partial<ActionPlan>) {
      const behavior = this.getById(behaviorId)
      if (!behavior || !behavior.actionPlans) {
        this.error = 'Behavior or action plans not found'
        return
      }
      
      const actionPlanIndex = behavior.actionPlans.findIndex(ap => ap.id === actionPlanId)
      if (actionPlanIndex === -1) {
        this.error = 'Action plan not found'
        return
      }
      
      const updatedActionPlans = [...behavior.actionPlans]
      updatedActionPlans[actionPlanIndex] = {
        ...updatedActionPlans[actionPlanIndex],
        ...updates,
        updatedAt: new Date()
      }
      
      await this.updateBehavior(behaviorId, { actionPlans: updatedActionPlans })
    },

    async deleteActionPlan(behaviorId: string, actionPlanId: string) {
      const behavior = this.getById(behaviorId)
      if (!behavior || !behavior.actionPlans) {
        this.error = 'Behavior or action plans not found'
        return
      }
      
      const updatedActionPlans = behavior.actionPlans.filter(ap => ap.id !== actionPlanId)
      
      await this.updateBehavior(behaviorId, { actionPlans: updatedActionPlans })
    }
  }
})
