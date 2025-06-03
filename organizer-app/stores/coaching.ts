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
  setDoc
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { usePeopleStore } from './people'
import type { CoachingRecord } from '~/types/models/coaching'
import type { KnowledgeDocument } from '~/types/models/knowledgeDocument'

export const useCoachingStore = defineStore('coaching', {
  state: () => ({
    records: [] as CoachingRecord[],
    currentRecord: null as CoachingRecord | null,
    knowledgeDocuments: [] as KnowledgeDocument[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getById: (state) => (id: string) => {
      return state.records.find(record => record.id === id) || null
    },
    
    getByPerson: (state) => (personId: string) => {
      return state.records.filter(record => record.personId === personId)
    },
    
    getSortedByDate: (state) => {
      return [...state.records].sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    }
  },

  actions: {
    // Knowledge Document Actions
    async fetchKnowledgeDocuments() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const knowledgeRef = collection(db, 'knowledgeDocuments')
        const q = query(
          knowledgeRef, 
          where('userId', '==', authStore.user.id),
          orderBy('updatedAt', 'desc')
        )
        const querySnapshot = await getDocs(q)
        
        this.knowledgeDocuments = querySnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Helper function to convert Firebase timestamps to Date objects
          const convertTimestamps = (obj: any) => {
            if (!obj) return obj
            
            // Convert createdAt/updatedAt at the top level
            if (obj.createdAt?.toDate) obj.createdAt = obj.createdAt.toDate()
            if (obj.updatedAt?.toDate) obj.updatedAt = obj.updatedAt.toDate()
            
            return obj
          }
          
          return {
            ...convertTimestamps(data),
            id: doc.id,
          } as KnowledgeDocument
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch knowledge documents'
        console.error('Error fetching knowledge documents:', error)
      } finally {
        this.loading = false
      }
    },
    
    async fetchKnowledgeDocument(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const docRef = doc(db, 'knowledgeDocuments', id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          
          // Ensure this document belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to knowledge document')
          }
          
          // Convert timestamps
          if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate()
          if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate()
          
          const document = {
            ...data,
            id: docSnap.id,
          } as KnowledgeDocument
          
          // Update the document in the local state
          const index = this.knowledgeDocuments.findIndex(d => d.id === id)
          if (index !== -1) {
            this.knowledgeDocuments[index] = document
          } else {
            this.knowledgeDocuments.push(document)
          }
          
          return document
        } else {
          throw new Error('Knowledge document not found')
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch knowledge document'
        console.error('Error fetching knowledge document:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async saveKnowledgeDocument(document: KnowledgeDocument) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        
        // Add the userId if it's not already there
        if (!document.userId) {
          document.userId = authStore.user.id
        }
        
        // Set timestamps
        const now = serverTimestamp()
        const clientNow = new Date()
        
        // Create a clean object without undefined values
        const documentData = Object.fromEntries(
          Object.entries(document).filter(([_, v]) => v !== undefined)
        )
        
        // Add timestamps
        if (!documentData.createdAt) {
          documentData.createdAt = now
        }
        documentData.updatedAt = now
        
        // Save the document
        let docId = document.id
        
        if (docId) {
          // Update existing document
          const docRef = doc(db, 'knowledgeDocuments', docId)
          await setDoc(docRef, documentData)
        } else {
          // Create new document with auto-generated ID
          const docRef = collection(db, 'knowledgeDocuments')
          const newDocRef = await addDoc(docRef, documentData)
          docId = newDocRef.id
        }
        
        // Update the document in the local state with client-side dates for immediate UI updates
        const updatedDocument = {
          ...document,
          id: docId,
          updatedAt: clientNow,
          createdAt: document.createdAt || clientNow
        }
        
        const index = this.knowledgeDocuments.findIndex(d => d.id === docId)
        if (index !== -1) {
          this.knowledgeDocuments[index] = updatedDocument
        } else {
          this.knowledgeDocuments.push(updatedDocument)
        }
        
        return docId
      } catch (error: any) {
        this.error = error.message || 'Failed to save knowledge document'
        console.error('Error saving knowledge document:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteKnowledgeDocument(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const docRef = doc(db, 'knowledgeDocuments', id)
        
        // First, get the document to verify ownership
        const docSnap = await getDoc(docRef)
        
        if (!docSnap.exists()) {
          throw new Error('Knowledge document not found')
        }
        
        const docData = docSnap.data()
        
        // Ensure this document belongs to the current user
        if (docData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to knowledge document')
        }
        
        await deleteDoc(docRef)
        
        // Remove the document from the local state
        this.knowledgeDocuments = this.knowledgeDocuments.filter(d => d.id !== id)
      } catch (error: any) {
        this.error = error.message || 'Failed to delete knowledge document'
        console.error('Error deleting knowledge document:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Coaching Record Actions
    async fetchRecords() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const coachingRef = collection(db, 'coaching')
        const q = query(
          coachingRef, 
          where('userId', '==', authStore.user.id),
          orderBy('updatedAt', 'desc')
        )
        const querySnapshot = await getDocs(q)
        
        this.records = querySnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Helper function to convert Firebase timestamps to Date objects
          const convertTimestamps = (obj: any) => {
            if (!obj) return obj
            
            // Convert createdAt/updatedAt at the top level
            if (obj.createdAt?.toDate) obj.createdAt = obj.createdAt.toDate()
            if (obj.updatedAt?.toDate) obj.updatedAt = obj.updatedAt.toDate()
            
            // For nested arrays with timestamps
            if (obj.strengths && Array.isArray(obj.strengths)) {
              obj.strengths.forEach((strength: any) => {
                if (strength.createdAt?.toDate) strength.createdAt = strength.createdAt.toDate()
                if (strength.updatedAt?.toDate) strength.updatedAt = strength.updatedAt.toDate()
                
                // Handle history logs
                if (strength.historyLog && Array.isArray(strength.historyLog)) {
                  strength.historyLog.forEach((log: any) => {
                    if (log.date?.toDate) log.date = log.date.toDate()
                  })
                }
              })
            }
            
            if (obj.weaknesses && Array.isArray(obj.weaknesses)) {
              obj.weaknesses.forEach((weakness: any) => {
                if (weakness.createdAt?.toDate) weakness.createdAt = weakness.createdAt.toDate()
                if (weakness.updatedAt?.toDate) weakness.updatedAt = weakness.updatedAt.toDate()
                
                // Handle history logs
                if (weakness.historyLog && Array.isArray(weakness.historyLog)) {
                  weakness.historyLog.forEach((log: any) => {
                    if (log.date?.toDate) log.date = log.date.toDate()
                  })
                }
              })
            }
            
            if (obj.goals && Array.isArray(obj.goals)) {
              obj.goals.forEach((goal: any) => {
                if (goal.createdAt?.toDate) goal.createdAt = goal.createdAt.toDate()
                if (goal.updatedAt?.toDate) goal.updatedAt = goal.updatedAt.toDate()
                if (goal.targetDate?.toDate) goal.targetDate = goal.targetDate.toDate()
                if (goal.completedDate?.toDate) goal.completedDate = goal.completedDate.toDate()
                
                // Handle history logs
                if (goal.historyLog && Array.isArray(goal.historyLog)) {
                  goal.historyLog.forEach((log: any) => {
                    if (log.date?.toDate) log.date = log.date.toDate()
                  })
                }
              })
            }
            
            if (obj.timeline && Array.isArray(obj.timeline)) {
              obj.timeline.forEach((entry: any) => {
                if (entry.createdAt?.toDate) entry.createdAt = entry.createdAt.toDate()
                if (entry.updatedAt?.toDate) entry.updatedAt = entry.updatedAt.toDate()
                if (entry.date?.toDate) entry.date = entry.date.toDate()
              })
            }
            
            return obj
          }
          
          return {
            ...convertTimestamps(data),
            id: doc.id,
          } as CoachingRecord
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch coaching records'
        console.error('Error fetching coaching records:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchRecord(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const recordRef = doc(db, 'coaching', id)
        const recordSnap = await getDoc(recordRef)
        
        if (recordSnap.exists()) {
          const data = recordSnap.data()
          
          // Ensure this record belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to coaching record')
          }
          
          // Helper function to convert Firebase timestamps to Date objects
          const convertTimestamps = (obj: any) => {
            if (!obj) return obj
            
            // Convert createdAt/updatedAt at the top level
            if (obj.createdAt?.toDate) obj.createdAt = obj.createdAt.toDate()
            if (obj.updatedAt?.toDate) obj.updatedAt = obj.updatedAt.toDate()
            
            // For nested arrays with timestamps
            if (obj.strengths && Array.isArray(obj.strengths)) {
              obj.strengths.forEach((strength: any) => {
                if (strength.createdAt?.toDate) strength.createdAt = strength.createdAt.toDate()
                if (strength.updatedAt?.toDate) strength.updatedAt = strength.updatedAt.toDate()
                
                // Handle history logs
                if (strength.historyLog && Array.isArray(strength.historyLog)) {
                  strength.historyLog.forEach((log: any) => {
                    if (log.date?.toDate) log.date = log.date.toDate()
                  })
                }
              })
            }
            
            if (obj.weaknesses && Array.isArray(obj.weaknesses)) {
              obj.weaknesses.forEach((weakness: any) => {
                if (weakness.createdAt?.toDate) weakness.createdAt = weakness.createdAt.toDate()
                if (weakness.updatedAt?.toDate) weakness.updatedAt = weakness.updatedAt.toDate()
                
                // Handle history logs
                if (weakness.historyLog && Array.isArray(weakness.historyLog)) {
                  weakness.historyLog.forEach((log: any) => {
                    if (log.date?.toDate) log.date = log.date.toDate()
                  })
                }
              })
            }
            
            if (obj.goals && Array.isArray(obj.goals)) {
              obj.goals.forEach((goal: any) => {
                if (goal.createdAt?.toDate) goal.createdAt = goal.createdAt.toDate()
                if (goal.updatedAt?.toDate) goal.updatedAt = goal.updatedAt.toDate()
                if (goal.targetDate?.toDate) goal.targetDate = goal.targetDate.toDate()
                if (goal.completedDate?.toDate) goal.completedDate = goal.completedDate.toDate()
                
                // Handle history logs
                if (goal.historyLog && Array.isArray(goal.historyLog)) {
                  goal.historyLog.forEach((log: any) => {
                    if (log.date?.toDate) log.date = log.date.toDate()
                  })
                }
              })
            }
            
            if (obj.timeline && Array.isArray(obj.timeline)) {
              obj.timeline.forEach((entry: any) => {
                if (entry.createdAt?.toDate) entry.createdAt = entry.createdAt.toDate()
                if (entry.updatedAt?.toDate) entry.updatedAt = entry.updatedAt.toDate()
                if (entry.date?.toDate) entry.date = entry.date.toDate()
              })
            }
            
            return obj
          }
          
          this.currentRecord = {
            ...convertTimestamps(data),
            id: recordSnap.id,
          } as CoachingRecord
          
          return this.currentRecord
        } else {
          this.error = 'Coaching record not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch coaching record'
        console.error('Error fetching coaching record:', error)
      } finally {
        this.loading = false
      }
    },

    async createRecord(newRecord: Partial<CoachingRecord>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const coachingRef = collection(db, 'coaching')
        
        // Create a clean object without undefined values, as Firebase doesn't accept undefined
        const recordData = {
          ...Object.fromEntries(
            Object.entries(newRecord).filter(([_, v]) => v !== undefined)
          ),
          userId: authStore.user.id,
          strengths: newRecord.strengths || [],
          weaknesses: newRecord.weaknesses || [],
          goals: newRecord.goals || [],
          timeline: newRecord.timeline || [],
          relatedTasks: newRecord.relatedTasks || [],
          icon: newRecord.icon || 'mdi-account-heart',
          color: newRecord.color || 'primary',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        const docRef = await addDoc(coachingRef, recordData)
        
        // Add the new record to the local state
        const addedRecord = {
          ...recordData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as CoachingRecord
        
        this.records.push(addedRecord)
        this.currentRecord = addedRecord
        
        return addedRecord
      } catch (error: any) {
        this.error = error.message || 'Failed to create coaching record'
        console.error('Error creating coaching record:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateRecord(id: string, updates: Partial<CoachingRecord>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const recordRef = doc(db, 'coaching', id)
        
        // First, get the record to verify ownership
        const recordSnap = await getDoc(recordRef)
        
        if (!recordSnap.exists()) {
          throw new Error('Coaching record not found')
        }
        
        const recordData = recordSnap.data()
        
        // Ensure this record belongs to the current user
        if (recordData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to coaching record')
        }
        
        // Filter out undefined values from the updates object
        const filteredUpdates: Partial<CoachingRecord> = {}
        
        // Copy only defined values
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            // Using type assertion to bypass TypeScript's index signature restriction
            (filteredUpdates as any)[key] = value
          }
        })
        
        // Add server timestamp
        const updateData = {
          ...filteredUpdates,
          updatedAt: serverTimestamp(),
        }
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id
        delete updateData.userId
        delete updateData.createdAt
        
        await updateDoc(recordRef, updateData)
        
        // Update local state
        const index = this.records.findIndex(r => r.id === id)
        if (index !== -1) {
          this.records[index] = {
            ...this.records[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        // Update current record if it's the one being edited
        if (this.currentRecord && this.currentRecord.id === id) {
          this.currentRecord = {
            ...this.currentRecord,
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        return this.currentRecord
      } catch (error: any) {
        this.error = error.message || 'Failed to update coaching record'
        console.error('Error updating coaching record:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteRecord(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const recordRef = doc(db, 'coaching', id)
        
        // First, get the record to verify ownership
        const recordSnap = await getDoc(recordRef)
        
        if (!recordSnap.exists()) {
          throw new Error('Coaching record not found')
        }
        
        const recordData = recordSnap.data()
        
        // Ensure this record belongs to the current user
        if (recordData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to coaching record')
        }
        
        await deleteDoc(recordRef)
        
        // Update local state
        this.records = this.records.filter(r => r.id !== id)
        
        // Clear current record if it was the one deleted
        if (this.currentRecord && this.currentRecord.id === id) {
          this.currentRecord = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete coaching record'
        console.error('Error deleting coaching record:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
