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
import type { Meeting } from '~/types/models'

export const useMeetingsStore = defineStore('meetings', {
  state: () => ({
    meetings: [] as Meeting[],
    currentMeeting: null as Meeting | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getById: (state) => (id: string) => {
      return state.meetings.find(meeting => meeting.id === id) || null
    },
    upcomingMeetings: (state) => {
      const now = new Date()
      return state.meetings
        .filter(meeting => meeting.startTime > now)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    },
    pastMeetings: (state) => {
      const now = new Date()
      return state.meetings
        .filter(meeting => meeting.startTime < now)
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    },
    getTodayMeetings: (state) => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      return state.meetings
        .filter(meeting => {
          const meetingDate = new Date(meeting.startTime)
          return meetingDate >= today && meetingDate < tomorrow
        })
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    },
    getByCategory: (state) => (category: string) => {
      return state.meetings.filter(meeting => meeting.category === category)
    },
    getByParticipant: (state) => (participantId: string) => {
      return state.meetings.filter(meeting => meeting.participants.includes(participantId))
    },
    getByProject: (state) => (projectId: string) => {
      return state.meetings.filter(meeting => 
        meeting.relatedProjects && meeting.relatedProjects.includes(projectId)
      )
    },
    getCategories: (state) => {
      const categories = new Set<string>()
      state.meetings.forEach(meeting => {
        if (meeting.category) categories.add(meeting.category)
      })
      return Array.from(categories)
    }
  },

  actions: {
    async fetchMeetings() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const meetingsRef = collection(db, 'meetings')
        const q = query(
          meetingsRef, 
          where('userId', '==', authStore.user.id),
          orderBy('startTime', 'desc')
        )
        const querySnapshot = await getDocs(q)
        
        this.meetings = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Meeting
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch meetings'
        console.error('Error fetching meetings:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchMeeting(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const meetingRef = doc(db, 'meetings', id)
        const meetingSnap = await getDoc(meetingRef)
        
        if (meetingSnap.exists()) {
          const data = meetingSnap.data()
          
          // Ensure this meeting belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to meeting')
          }
          
          this.currentMeeting = {
            ...data,
            id: meetingSnap.id,
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Meeting
        } else {
          this.error = 'Meeting not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch meeting'
        console.error('Error fetching meeting:', error)
      } finally {
        this.loading = false
      }
    },

    async createMeeting(newMeeting: Partial<Meeting>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const meetingsRef = collection(db, 'meetings')
        
        // Prepare base meeting data
        const meetingData: any = {
          ...newMeeting,
          userId: authStore.user.id,
          participants: newMeeting.participants || [],
          tasks: newMeeting.tasks || [],
          relatedProjects: newMeeting.relatedProjects || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        // Only set startTime and endTime if this is not a "to be planned" meeting
        // or if explicit startTime/endTime are provided
        if (newMeeting.plannedStatus !== 'to_be_planned' || newMeeting.startTime) {
          // Ensure startTime and endTime are Date objects
          let startTime = newMeeting.startTime || new Date()
          let endTime = newMeeting.endTime || new Date(startTime.getTime() + 60 * 60 * 1000) // Default to 1 hour
          
          meetingData.startTime = Timestamp.fromDate(startTime)
          meetingData.endTime = Timestamp.fromDate(endTime)
        }
        
        const docRef = await addDoc(meetingsRef, meetingData)
        
        // Add the new meeting to the local state
        const addedMeeting: any = {
          ...meetingData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        // Set the startTime and endTime in the local state if they exist in meetingData
        if (meetingData.startTime) {
          addedMeeting.startTime = newMeeting.startTime || new Date()
          addedMeeting.endTime = newMeeting.endTime || new Date(addedMeeting.startTime.getTime() + 60 * 60 * 1000)
        }
        
        this.meetings.push(addedMeeting)
        this.currentMeeting = addedMeeting
        
        return docRef.id
      } catch (error: any) {
        this.error = error.message || 'Failed to create meeting'
        console.error('Error creating meeting:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateMeeting(id: string, updates: Partial<Meeting>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const meetingRef = doc(db, 'meetings', id)
        
        // First, get the meeting to verify ownership
        const meetingSnap = await getDoc(meetingRef)
        
        if (!meetingSnap.exists()) {
          throw new Error('Meeting not found')
        }
        
        const meetingData = meetingSnap.data()
        
        // Ensure this meeting belongs to the current user
        if (meetingData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to meeting')
        }
        
        // Prepare update data
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp(),
        }
        
        // Convert Date objects to Timestamps if present
        if (updates.startTime) {
          updateData.startTime = Timestamp.fromDate(updates.startTime)
        }
        
        if (updates.endTime) {
          updateData.endTime = Timestamp.fromDate(updates.endTime)
        }
        
        // Handle removing dates for meetings being changed to "to be planned"
        if (updates.plannedStatus === 'to_be_planned' && !updates.startTime) {
          // If we're changing to "to be planned" and no new dates provided, 
          // use deleteField() to remove these fields from Firestore
          const { deleteField } = require('firebase/firestore')
          updateData.startTime = deleteField()
          updateData.endTime = deleteField()
        }
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id
        delete updateData.userId
        delete updateData.createdAt
        
        await updateDoc(meetingRef, updateData)
        
        // Update local state
        const index = this.meetings.findIndex(m => m.id === id)
        if (index !== -1) {
          this.meetings[index] = {
            ...this.meetings[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        // Update current meeting if it's the one being edited
        if (this.currentMeeting && this.currentMeeting.id === id) {
          this.currentMeeting = {
            ...this.currentMeeting,
            ...updates,
            updatedAt: new Date(),
          }
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update meeting'
        console.error('Error updating meeting:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteMeeting(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const meetingRef = doc(db, 'meetings', id)
        
        // First, get the meeting to verify ownership
        const meetingSnap = await getDoc(meetingRef)
        
        if (!meetingSnap.exists()) {
          throw new Error('Meeting not found')
        }
        
        const meetingData = meetingSnap.data()
        
        // Ensure this meeting belongs to the current user
        if (meetingData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to meeting')
        }
        
        await deleteDoc(meetingRef)
        
        // Update local state
        this.meetings = this.meetings.filter(m => m.id !== id)
        
        // Clear current meeting if it was the one deleted
        if (this.currentMeeting && this.currentMeeting.id === id) {
          this.currentMeeting = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete meeting'
        console.error('Error deleting meeting:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async createSummary(id: string, summary: string) {
      if (!summary) {
        this.error = 'Summary cannot be empty'
        return
      }
      
      return this.updateMeeting(id, { summary })
    },

    async addTask(meetingId: string, taskId: string) {
      const meeting = this.getById(meetingId)
      if (!meeting) {
        this.error = 'Meeting not found'
        return
      }
      
      const tasks = [...meeting.tasks]
      if (!tasks.includes(taskId)) {
        tasks.push(taskId)
      }
      
      return this.updateMeeting(meetingId, { tasks })
    },

    async removeTask(meetingId: string, taskId: string) {
      const meeting = this.getById(meetingId)
      if (!meeting) {
        this.error = 'Meeting not found'
        return
      }
      
      const tasks = meeting.tasks.filter(id => id !== taskId)
      
      return this.updateMeeting(meetingId, { tasks })
    },

    async addParticipant(meetingId: string, participantId: string) {
      const meeting = this.getById(meetingId)
      if (!meeting) {
        this.error = 'Meeting not found'
        return
      }
      
      const participants = [...meeting.participants]
      if (!participants.includes(participantId)) {
        participants.push(participantId)
      }
      
      return this.updateMeeting(meetingId, { participants })
    },

    async removeParticipant(meetingId: string, participantId: string) {
      const meeting = this.getById(meetingId)
      if (!meeting) {
        this.error = 'Meeting not found'
        return
      }
      
      const participants = meeting.participants.filter(id => id !== participantId)
      
      return this.updateMeeting(meetingId, { participants })
    }
  }
})
