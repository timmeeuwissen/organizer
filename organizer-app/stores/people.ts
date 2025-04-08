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
import type { Person } from '~/types/models'

export const usePeopleStore = defineStore('people', {
  state: () => ({
    people: [] as Person[],
    currentPerson: null as Person | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getById: (state) => (id: string) => {
      return state.people.find(person => person.id === id) || null
    },
    getRecentlyContacted: (state) => (limit: number = 5) => {
      return [...state.people]
        .filter(person => person.lastContacted)
        .sort((a, b) => {
          const dateA = a.lastContacted ? a.lastContacted.getTime() : 0
          const dateB = b.lastContacted ? b.lastContacted.getTime() : 0
          return dateB - dateA
        })
        .slice(0, limit)
    },
    getByOrganization: (state) => (organization: string) => {
      return state.people.filter(person => person.organization === organization)
    },
    getByTeam: (state) => (team: string) => {
      return state.people.filter(person => person.team === team)
    },
    getByRole: (state) => (role: string) => {
      return state.people.filter(person => person.role === role)
    }
  },

  actions: {
    async fetchPeople() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const peopleRef = collection(db, 'people')
        const q = query(
          peopleRef, 
          where('userId', '==', authStore.user.id),
          orderBy('lastName')
        )
        const querySnapshot = await getDocs(q)
        
        this.people = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            lastContacted: data.lastContacted?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Person
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch people'
        console.error('Error fetching people:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchPerson(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const personRef = doc(db, 'people', id)
        const personSnap = await getDoc(personRef)
        
        if (personSnap.exists()) {
          const data = personSnap.data()
          
          // Ensure this person belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to person')
          }
          
          this.currentPerson = {
            ...data,
            id: personSnap.id,
            lastContacted: data.lastContacted?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Person
        } else {
          this.error = 'Person not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch person'
        console.error('Error fetching person:', error)
      } finally {
        this.loading = false
      }
    },

    async createPerson(newPerson: Partial<Person>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const peopleRef = collection(db, 'people')
        
        const personData = {
          ...newPerson,
          userId: authStore.user.id,
          relatedMeetings: newPerson.relatedMeetings || [],
          relatedProjects: newPerson.relatedProjects || [],
          relatedTasks: newPerson.relatedTasks || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        const docRef = await addDoc(peopleRef, personData)
        
        // Add the new person to the local state
        const addedPerson = {
          ...personData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Person
        
        this.people.push(addedPerson)
        this.currentPerson = addedPerson
        
        return docRef.id
      } catch (error: any) {
        this.error = error.message || 'Failed to create person'
        console.error('Error creating person:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePerson(id: string, updates: Partial<Person>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const personRef = doc(db, 'people', id)
        
        // First, get the person to verify ownership
        const personSnap = await getDoc(personRef)
        
        if (!personSnap.exists()) {
          throw new Error('Person not found')
        }
        
        const personData = personSnap.data()
        
        // Ensure this person belongs to the current user
        if (personData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to person')
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
        
        await updateDoc(personRef, updateData)
        
        // Update local state
        const index = this.people.findIndex(p => p.id === id)
        if (index !== -1) {
          this.people[index] = {
            ...this.people[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        // Update current person if it's the one being edited
        if (this.currentPerson && this.currentPerson.id === id) {
          this.currentPerson = {
            ...this.currentPerson,
            ...updates,
            updatedAt: new Date(),
          }
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update person'
        console.error('Error updating person:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deletePerson(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const personRef = doc(db, 'people', id)
        
        // First, get the person to verify ownership
        const personSnap = await getDoc(personRef)
        
        if (!personSnap.exists()) {
          throw new Error('Person not found')
        }
        
        const personData = personSnap.data()
        
        // Ensure this person belongs to the current user
        if (personData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to person')
        }
        
        await deleteDoc(personRef)
        
        // Update local state
        this.people = this.people.filter(p => p.id !== id)
        
        // Clear current person if it was the one deleted
        if (this.currentPerson && this.currentPerson.id === id) {
          this.currentPerson = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete person'
        console.error('Error deleting person:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateLastContactDate(id: string, date: Date = new Date()) {
      const person = this.getById(id)
      if (!person) {
        this.error = 'Person not found'
        return
      }
      
      return this.updatePerson(id, { lastContacted: date })
    }
  }
})
