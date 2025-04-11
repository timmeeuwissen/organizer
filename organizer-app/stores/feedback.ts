import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { doc, collection, addDoc, updateDoc, getDocs, query, where, orderBy, getFirestore } from 'firebase/firestore'
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
      const db = getFirestore()
      const feedbacksRef = collection(db, 'feedbacks')
      const q = query(
        feedbacksRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      
      feedbacks.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[]
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
  
  // Get unseen feedbacks
  const unseenFeedbacks = computed(() => {
    return feedbacks.value.filter(feedback => !feedback.seen)
  })
  
  // Get feedbacks that have been marked with "yes"
  const approvedFeedbacks = computed(() => {
    return feedbacks.value.filter(feedback => feedback.userAction === 'yes')
  })

  return {
    feedbacks,
    loading,
    error,
    unseenFeedbacks,
    approvedFeedbacks,
    fetchFeedbacks,
    addFeedback,
    updateFeedback,
    markAsSeen,
    setUserAction,
    clearError
  }
})
