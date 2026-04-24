import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  getFirestore
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import type { AIHistoryEntry, AICallMetadata } from '~/types/models/aiHistory'
import type { AIAnalysisResult } from '~/types/models/aiIntegration'

export const useAIHistoryStore = defineStore('aiHistory', {
  state: () => ({
    history: [] as AIHistoryEntry[],
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchHistory () {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      this.loading = true
      this.error = null

      try {
        const db = getFirestore()
        const ref = collection(db, 'aiHistory')
        const q = query(
          ref,
          where('userId', '==', authStore.user.id),
          orderBy('timestamp', 'desc')
        )
        const snap = await getDocs(q)
        this.history = snap.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            timestamp: data.timestamp?.toDate() || new Date()
          } as AIHistoryEntry
        })
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch AI history'
        console.error('Error fetching AI history:', err)
      } finally {
        this.loading = false
      }
    },

    async addEntry (
      inputText: string,
      result: AIAnalysisResult,
      metadata: AICallMetadata
    ) {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      try {
        const db = getFirestore()
        const ref = collection(db, 'aiHistory')

        // JSON-serialize result so Firestore doesn't reject Date objects in nested details
        const safeResult = JSON.parse(JSON.stringify(result))

        const docRef = await addDoc(ref, {
          inputText,
          result: safeResult,
          metadata,
          userId: authStore.user.id,
          timestamp: serverTimestamp()
        })

        this.history.unshift({
          id: docRef.id,
          timestamp: new Date(),
          inputText,
          result,
          metadata
        })
      } catch (err: any) {
        this.error = err.message || 'Failed to save AI history'
        console.error('Failed to save AI history entry:', err)
      }
    }
  }
})
