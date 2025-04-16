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
  getFirestore,
  Timestamp
} from 'firebase/firestore'
import { useAuthStore } from '../auth'
import type { MeetingCategory } from '~/types/models'

export const useMeetingCategoriesStore = defineStore('meetingCategories', {
  state: () => ({
    categories: [] as MeetingCategory[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getById: (state) => (id: string) => {
      return state.categories.find(category => category.id === id) || null
    },
    getCategoriesCount: (state) => {
      return state.categories.length
    }
  },

  actions: {
    async fetchCategories() {
      console.log('[store meeting categories] fetching categories')
      const authStore = useAuthStore()
      if (!authStore.user) {
        console.error('[store meeting categories] cannot update, no authentication')
        return
      }
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const categoriesRef = collection(db, 'meetingCategories')
        const q = query(categoriesRef, where('userId', '==', authStore.user.id))
        const querySnapshot = await getDocs(q)
        
        this.categories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as MeetingCategory[]

      console.log('[store meeting categories] state is now: ', this)

      } catch (error: any) {
        this.error = error.message || 'Failed to fetch meeting categories'
        console.error('Error fetching meeting categories:', error)
      } finally {
        this.loading = false
      }
    },

    async createCategory(categoryData: Partial<MeetingCategory>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const categoriesRef = collection(db, 'meetingCategories')
        
        const newCategory = {
          ...categoryData,
          userId: authStore.user.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        const docRef = await addDoc(categoriesRef, newCategory)
        
        // Add to local state
        this.categories.push({
          ...newCategory,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date()
        } as MeetingCategory)
        
        return docRef.id
      } catch (error: any) {
        this.error = error.message || 'Failed to create category'
        console.error('Error creating category:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateCategory(id: string, updates: Partial<MeetingCategory>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const categoryRef = doc(db, 'meetingCategories', id)
        
        // First, get the category to verify ownership
        const categorySnap = await getDoc(categoryRef)
        
        if (!categorySnap.exists()) {
          throw new Error('Category not found')
        }
        
        const categoryData = categorySnap.data()
        
        // Ensure this category belongs to the current user
        if (categoryData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to category')
        }
        
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp()
        }
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id
        delete updateData.userId
        delete updateData.createdAt
        
        await updateDoc(categoryRef, updateData)
        
        // Update local state
        const index = this.categories.findIndex(c => c.id === id)
        if (index !== -1) {
          this.categories[index] = {
            ...this.categories[index],
            ...updates,
            updatedAt: new Date()
          }
        }
        
        return id
      } catch (error: any) {
        this.error = error.message || 'Failed to update category'
        console.error('Error updating category:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteCategory(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const categoryRef = doc(db, 'meetingCategories', id)
        
        // First, get the category to verify ownership
        const categorySnap = await getDoc(categoryRef)
        
        if (!categorySnap.exists()) {
          throw new Error('Category not found')
        }
        
        const categoryData = categorySnap.data()
        
        // Ensure this category belongs to the current user
        if (categoryData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to category')
        }
        
        await deleteDoc(categoryRef)
        
        // Update local state
        this.categories = this.categories.filter(c => c.id !== id)
        
        return id
      } catch (error: any) {
        this.error = error.message || 'Failed to delete category'
        console.error('Error deleting category:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Seeds default categories from the YAML file if none exist
    async seedDefaultCategories() {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      // Only seed if no categories exist
      if (this.categories.length > 0) return
      
      try {
        // Import is dynamic to avoid SSR issues
        const { loadMeetingCategories } = await import('~/data/yamlLoader')
        const defaultCategories = loadMeetingCategories()
        
        for (const category of defaultCategories.categories) {
          await this.createCategory({
            name: category.name,
            description: category.description,
            color: category.color,
            icon: category.icon
          })
        }
      } catch (error) {
        console.error('Error seeding default categories:', error)
      }
    }
  }
})
