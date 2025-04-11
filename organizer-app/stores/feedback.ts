import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { doc, collection, addDoc, updateDoc, getDocs, query, where, orderBy, getFirestore, limit } from 'firebase/firestore'
import type { Feedback } from '~/types/models'

export const useFeedbackStore = defineStore('feedback', () => {
  const feedbacks = ref<Feedback[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Clear any stored error
  const clearError = () => {
    error.value = null
  }

  // Get all feedbacks
  const fetchFeedbacks = async (userId: string) => {
    loading.value = true
    error.value = null
    
    try {
      console.log('Initializing Firestore connection...')
      const db = getFirestore()
      
      if (!db) {
        console.error('Failed to initialize Firestore')
        error.value = 'Failed to connect to Firestore'
        return
      }
      
      console.log('Firestore initialized successfully')
      const feedbacksRef = collection(db, 'feedbacks')
      
      console.log('Getting all feedback items (development mode - no filters)')
      
      try {
        // First try a simple query to see if we can access Firestore at all
        const testQuery = query(feedbacksRef, limit(1))
        const testResult = await getDocs(testQuery)
        console.log(`Test query returned ${testResult.docs.length} items`)
      } catch (testError) {
        console.error('Test query failed:', testError)
      }
      
      // Development mode - get ALL feedback without filtering by userId
      const q = query(feedbacksRef)
      
      console.log('Executing main query...')
      const querySnapshot = await getDocs(q)
      
      console.log(`Query returned ${querySnapshot.docs.length} items`)
      
      if (querySnapshot.empty) {
        console.log('No feedback items found')
        feedbacks.value = []
        return
      }
      
      // Process results with detailed logging
      const results: Feedback[] = []
      
      querySnapshot.forEach(doc => {
        try {
          const rawData = doc.data()
          console.log(`Processing document ${doc.id}:`, rawData)
          
          // Convert Firestore timestamps to Date objects
          let processedData: any = { ...rawData }
          
          // Ensure data has all required fields
          const feedback: Feedback = {
            id: doc.id,
            userId: processedData.userId || 'unknown',
            message: processedData.message || '',
            screenshot: processedData.screenshot || '',
            consoleMessages: processedData.consoleMessages || '',
            timestamp: processedData.timestamp?.toDate?.() || new Date(),
            seen: !!processedData.seen,
            userAction: processedData.userAction || undefined,
            improved: !!processedData.improved,
            improvedAt: processedData.improvedAt?.toDate?.() || undefined,
            archived: !!processedData.archived,
            archivedAt: processedData.archivedAt?.toDate?.() || undefined,
            processedByClaude: !!processedData.processedByClaude,
            processedAt: processedData.processedAt?.toDate?.() || undefined,
            createdAt: processedData.createdAt?.toDate?.() || new Date(),
            updatedAt: processedData.updatedAt?.toDate?.() || new Date(),
            page: processedData.page || ''
          }
          
          console.log(`Processed feedback object:`, feedback)
          results.push(feedback)
        } catch (docError) {
          console.error(`Error processing document ${doc.id}:`, docError)
        }
      })
      
      console.log(`Successfully processed ${results.length} feedback items`)
      feedbacks.value = results
      
    } catch (e) {
      console.error('Error fetching feedbacks:', e)
      error.value = 'Failed to load feedbacks'
    } finally {
      loading.value = false
    }
  }

  // Add new feedback
  const addFeedback = async (feedbackData: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt' | 'seen' | 'userAction'>) => {
    loading.value = true
    error.value = null
    
    try {
      const newFeedback: Omit<Feedback, 'id'> = {
        ...feedbackData,
        seen: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const db = getFirestore()
      const docRef = await addDoc(collection(db, 'feedbacks'), newFeedback)
      
      feedbacks.value.unshift({
        ...newFeedback,
        id: docRef.id
      } as Feedback)
      
      return docRef.id
    } catch (e) {
      console.error('Error adding feedback:', e)
      error.value = 'Failed to add feedback'
      return null
    } finally {
      loading.value = false
    }
  }

  // Update feedback
  const updateFeedback = async (id: string, data: Partial<Feedback>) => {
    loading.value = true
    error.value = null
    
    try {
      const db = getFirestore()
      const feedbackRef = doc(db, 'feedbacks', id)
      await updateDoc(feedbackRef, {
        ...data,
        updatedAt: new Date()
      })
      
      // Update local state
      const index = feedbacks.value.findIndex(f => f.id === id)
      if (index !== -1) {
        feedbacks.value[index] = {
          ...feedbacks.value[index],
          ...data,
          updatedAt: new Date()
        }
      }
      
      return true
    } catch (e) {
      console.error('Error updating feedback:', e)
      error.value = 'Failed to update feedback'
      return false
    } finally {
      loading.value = false
    }
  }

  // Mark feedback as seen
  const markAsSeen = async (id: string) => {
    return updateFeedback(id, { seen: true })
  }
  
  // Set user action (yes/no)
  const setUserAction = async (id: string, action: 'yes' | 'no') => {
    return updateFeedback(id, { userAction: action })
  }
  
  // Mark feedback as improved
  const markAsImproved = async (id: string, improved: boolean = true) => {
    return updateFeedback(id, { 
      improved, 
      improvedAt: improved ? new Date() : undefined 
    })
  }
  
  // Archive feedback
  const archiveFeedback = async (id: string, archived: boolean = true) => {
    return updateFeedback(id, {
      archived,
      archivedAt: archived ? new Date() : undefined
    })
  }
  
  // Get unseen feedbacks
  const unseenFeedbacks = computed(() => {
    return feedbacks.value.filter(feedback => !feedback.seen && !feedback.archived)
  })
  
  // Get feedbacks that have been marked with "yes"
  const approvedFeedbacks = computed(() => {
    return feedbacks.value.filter(feedback => feedback.userAction === 'yes' && !feedback.archived)
  })
  
  // Get improved feedbacks
  const improvedFeedbacks = computed(() => {
    return feedbacks.value.filter(feedback => feedback.improved === true && !feedback.archived)
  })
  
  // Get archived feedbacks
  const archivedFeedbacks = computed(() => {
    return feedbacks.value.filter(feedback => feedback.archived === true)
  })

  return {
    feedbacks,
    loading,
    error,
    unseenFeedbacks,
    approvedFeedbacks,
    improvedFeedbacks,
    archivedFeedbacks,
    fetchFeedbacks,
    addFeedback,
    updateFeedback,
    markAsSeen,
    setUserAction,
    markAsImproved,
    archiveFeedback,
    clearError
  }
})
