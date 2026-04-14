import { defineStore } from 'pinia'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  getFirestore
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useNotificationStore } from '~/stores/notification'
import type { Roadmap, RoadmapActivity, RoadmapPhase, RoadmapMilestone, RoadmapGranularity } from '~/types/models/roadmap'

export const useRoadmapStore = defineStore('roadmap', {
  persist: false, // roadmap is always fetched fresh from Firestore on tab activation

  state: () => ({
    roadmap: null as Roadmap | null,
    loading: false,
    error: null as string | null,
    _saveTimerId: null as ReturnType<typeof setTimeout> | null
  }),

  actions: {
    async fetchRoadmap (projectId: string): Promise<void> {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      this.loading = true
      this.error = null

      try {
        const db = getFirestore()
        const ref = doc(db, 'projects', projectId, 'roadmap', 'default')
        const snap = await getDoc(ref)

        if (snap.exists()) {
          const data = snap.data()

          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to roadmap')
          }

          this.roadmap = {
            ...data,
            id: snap.id,
            phases: (data.phases || []).map((p: any): RoadmapPhase => ({
              ...p,
              startDate: p.startDate?.toDate() || new Date(),
              endDate: p.endDate?.toDate() || new Date()
            })),
            activities: (data.activities || []).map((a: any): RoadmapActivity => ({
              ...a,
              startDate: a.startDate?.toDate() || new Date(),
              endDate: a.endDate?.toDate() || new Date(),
              links: a.links || []
            })),
            milestones: (data.milestones || []).map((m: any): RoadmapMilestone => ({
              ...m,
              date: m.date?.toDate() || new Date()
            })),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Roadmap
        } else {
          this.roadmap = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch roadmap'
        useNotificationStore().error('Failed to load roadmap')
        console.error('[roadmap] fetchRoadmap error:', error)
      } finally {
        this.loading = false
      }
    },

    async createRoadmap (projectId: string): Promise<void> {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      const now = new Date()
      const newRoadmap: Roadmap = {
        id: 'default',
        projectId,
        userId: authStore.user.id,
        granularity: 'month',
        phases: [],
        activities: [],
        milestones: [],
        createdAt: now,
        updatedAt: now
      }

      this.roadmap = newRoadmap
      await this._persistRoadmap(projectId)
      useNotificationStore().info('Roadmap created')
    },

    scheduleSave (projectId: string): void {
      if (this._saveTimerId) { clearTimeout(this._saveTimerId) }
      this._saveTimerId = setTimeout(() => { void this._persistRoadmap(projectId) }, 1000)
    },

    async _persistRoadmap (projectId: string): Promise<void> {
      const authStore = useAuthStore()
      if (!authStore.user || !this.roadmap) { return }

      try {
        const db = getFirestore()
        const ref = doc(db, 'projects', projectId, 'roadmap', 'default')
        await setDoc(ref, {
          ...this.roadmap,
          updatedAt: serverTimestamp()
        })
      } catch (error: any) {
        useNotificationStore().error('Failed to save roadmap')
        console.error('[roadmap] save error:', error)
      }
    },

    setGranularity (projectId: string, granularity: RoadmapGranularity): void {
      if (!this.roadmap) { return }
      this.roadmap.granularity = granularity
      this.scheduleSave(projectId)
    },

    shiftAll (projectId: string, days: number): void {
      if (!this.roadmap) { return }
      const ms = days * 86400000

      this.roadmap.phases = this.roadmap.phases.map(p => ({
        ...p,
        startDate: new Date(p.startDate.getTime() + ms),
        endDate: new Date(p.endDate.getTime() + ms)
      }))
      this.roadmap.activities = this.roadmap.activities.map(a => ({
        ...a,
        startDate: new Date(a.startDate.getTime() + ms),
        endDate: new Date(a.endDate.getTime() + ms)
      }))
      this.roadmap.milestones = this.roadmap.milestones.map(m => ({
        ...m,
        date: new Date(m.date.getTime() + ms)
      }))
      this.scheduleSave(projectId)
    },

    upsertActivity (projectId: string, activity: RoadmapActivity): void {
      if (!this.roadmap) { return }
      const idx = this.roadmap.activities.findIndex(a => a.id === activity.id)
      if (idx === -1) {
        this.roadmap.activities.push(activity)
      } else {
        this.roadmap.activities[idx] = activity
      }
      this.scheduleSave(projectId)
    },

    deleteActivity (projectId: string, id: string): void {
      if (!this.roadmap) { return }
      this.roadmap.activities = this.roadmap.activities.filter(a => a.id !== id)
      this.roadmap.milestones = this.roadmap.milestones.map(m =>
        m.activityId === id ? { ...m, activityId: undefined } : m
      )
      this.scheduleSave(projectId)
    },

    upsertPhase (projectId: string, phase: RoadmapPhase): void {
      if (!this.roadmap) { return }
      const idx = this.roadmap.phases.findIndex(p => p.id === phase.id)
      if (idx === -1) {
        this.roadmap.phases.push(phase)
      } else {
        this.roadmap.phases[idx] = phase
      }
      this.scheduleSave(projectId)
    },

    deletePhase (projectId: string, id: string): void {
      if (!this.roadmap) { return }
      this.roadmap.phases = this.roadmap.phases.filter(p => p.id !== id)
      this.roadmap.activities = this.roadmap.activities.map(a =>
        a.phaseId === id ? { ...a, phaseId: undefined } : a
      )
      this.scheduleSave(projectId)
    },

    upsertMilestone (projectId: string, milestone: RoadmapMilestone): void {
      if (!this.roadmap) { return }
      const idx = this.roadmap.milestones.findIndex(m => m.id === milestone.id)
      if (idx === -1) {
        this.roadmap.milestones.push(milestone)
      } else {
        this.roadmap.milestones[idx] = milestone
      }
      this.scheduleSave(projectId)
    },

    deleteMilestone (projectId: string, id: string): void {
      if (!this.roadmap) { return }
      this.roadmap.milestones = this.roadmap.milestones.filter(m => m.id !== id)
      this.scheduleSave(projectId)
    }
  }
})
