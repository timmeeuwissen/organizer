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
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useAuthStore } from './auth'
import type { Team, TeamMailMeta, TeamColumnLayoutMode, Person } from '~/types/models'

function mapTeamDoc(id: string, data: Record<string, unknown>): Team {
  return {
    id,
    userId: String(data.userId ?? ''),
    name: String(data.name ?? ''),
    description: data.description != null ? String(data.description) : undefined,
    columnLayoutMode: (data.columnLayoutMode as TeamColumnLayoutMode) || 'alphabetical',
    memberPersonIds: Array.isArray(data.memberPersonIds) ? [...data.memberPersonIds] as string[] : [],
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  }
}

/**
 * Firestore rules use request.auth.uid. If Pinia has a user but Firebase Auth has no
 * session (e.g. expired token, demo/bypass mismatch, stale persist), every request is denied.
 */
function teamsFirebaseSessionError(authUserId: string): string | null {
  try {
    const fb = getAuth().currentUser
    if (!fb) {
      return 'Teams require an active Firebase sign-in. Sign out and sign in again.'
    }
    if (fb.uid !== authUserId) {
      return 'Teams require a matching Firebase account. Sign out and sign in again.'
    }
  } catch {
    /* getAuth() may throw if the app is not initialized; let Firestore surface the error */
  }
  return null
}

function formatTeamsFirestoreError(e: unknown): string {
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
  const base = e instanceof Error ? e.message : 'Teams request failed'
  if (code === 'permission-denied') {
    return `${base} If you are signed in, deploy Firestore rules for collections teams and teamMailMeta (see docs/firestore-deployment.md).`
  }
  return base
}

function mapMailMetaDoc(id: string, data: Record<string, unknown>): TeamMailMeta {
  return {
    id,
    userId: String(data.userId ?? ''),
    teamId: String(data.teamId ?? ''),
    accountId: String(data.accountId ?? ''),
    emailId: String(data.emailId ?? ''),
    personId: String(data.personId ?? ''),
    projectId: data.projectId != null && data.projectId !== '' ? String(data.projectId) : null,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  }
}

export const useTeamsStore = defineStore('teams', {
  state: () => ({
    teams: [] as Team[],
    currentTeam: null as Team | null,
    teamMailMetaByTeamId: {} as Record<string, TeamMailMeta[]>,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getById: (storeState) => (id: string) => storeState.teams.find((t) => t.id === id) ?? null,
    mailMetaForTeam: (storeState) => (teamId: string) => storeState.teamMailMetaByTeamId[teamId] ?? [],
  },

  actions: {
    async fetchTeams() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) {
        this.error = sessionErr
        return
      }

      this.loading = true
      this.error = null
      try {
        const db = getFirestore()
        const ref = collection(db, 'teams')
        const q = query(ref, where('userId', '==', authStore.user.id), orderBy('name'))
        const snap = await getDocs(q)
        this.teams = snap.docs.map((d) => mapTeamDoc(d.id, d.data() as Record<string, unknown>))
      } catch (e: unknown) {
        this.error = formatTeamsFirestoreError(e)
        console.error(e)
      } finally {
        this.loading = false
      }
    },

    async fetchTeam(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) {
        this.error = sessionErr
        return
      }

      this.loading = true
      this.error = null
      try {
        const db = getFirestore()
        const dref = doc(db, 'teams', id)
        const snap = await getDoc(dref)
        if (!snap.exists()) {
          this.currentTeam = null
          this.error = 'Team not found'
          return
        }
        const data = snap.data() as Record<string, unknown>
        if (data.userId !== authStore.user.id) {
          this.currentTeam = null
          this.error = 'Unauthorized'
          return
        }
        this.currentTeam = mapTeamDoc(snap.id, data)
      } catch (e: unknown) {
        this.error = formatTeamsFirestoreError(e)
        console.error(e)
      } finally {
        this.loading = false
      }
    },

    async fetchTeamMailMeta(teamId: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) {
        console.warn('fetchTeamMailMeta skipped:', sessionErr)
        this.teamMailMetaByTeamId[teamId] = []
        return
      }

      try {
        const db = getFirestore()
        const ref = collection(db, 'teamMailMeta')
        const q = query(
          ref,
          where('userId', '==', authStore.user.id),
          where('teamId', '==', teamId),
        )
        const snap = await getDocs(q)
        this.teamMailMetaByTeamId[teamId] = snap.docs.map((d) =>
          mapMailMetaDoc(d.id, d.data() as Record<string, unknown>),
        )
      } catch (e) {
        console.error('fetchTeamMailMeta', e)
        this.teamMailMetaByTeamId[teamId] = []
      }
    },

    async createTeam(payload: { name: string; description?: string }) {
      const authStore = useAuthStore()
      if (!authStore.user) throw new Error('Not authenticated')

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) throw new Error(sessionErr)

      const db = getFirestore()
      const ref = collection(db, 'teams')
      const docData: Record<string, unknown> = {
        userId: authStore.user.id,
        name: payload.name.trim(),
        columnLayoutMode: 'alphabetical',
        memberPersonIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      if (payload.description?.trim()) {
        docData.description = payload.description.trim()
      }
      try {
        const docRef = await addDoc(ref, docData)
        await this.fetchTeams()
        return docRef.id
      } catch (e: unknown) {
        throw new Error(formatTeamsFirestoreError(e))
      }
    },

    async updateTeam(
      id: string,
      patch: Partial<{
        name: string
        description: string
        columnLayoutMode: TeamColumnLayoutMode
        memberPersonIds: string[]
      }>,
    ) {
      const authStore = useAuthStore()
      if (!authStore.user) throw new Error('Not authenticated')

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) throw new Error(sessionErr)

      const db = getFirestore()
      const dref = doc(db, 'teams', id)
      const data: Record<string, unknown> = { updatedAt: serverTimestamp() }
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) data[k] = v
      }
      try {
        await updateDoc(dref, data)
        await this.fetchTeams()
        if (this.currentTeam?.id === id) {
          await this.fetchTeam(id)
        }
      } catch (e: unknown) {
        throw new Error(formatTeamsFirestoreError(e))
      }
    },

    async deleteTeam(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) {
        console.warn('deleteTeam skipped:', sessionErr)
        return
      }

      const db = getFirestore()
      try {
        // delete mail meta for team
        const metaRef = collection(db, 'teamMailMeta')
        const mq = query(metaRef, where('userId', '==', authStore.user.id), where('teamId', '==', id))
        const metaSnap = await getDocs(mq)
        await Promise.all(metaSnap.docs.map((d) => deleteDoc(d.ref)))

        await deleteDoc(doc(db, 'teams', id))
        delete this.teamMailMetaByTeamId[id]
        if (this.currentTeam?.id === id) this.currentTeam = null
        await this.fetchTeams()
      } catch (e: unknown) {
        this.error = formatTeamsFirestoreError(e)
        console.error(e)
      }
    },

    async addMember(teamId: string, personId: string) {
      let t = this.teams.find((x) => x.id === teamId) ?? this.currentTeam
      if (!t || t.id !== teamId) {
        await this.fetchTeam(teamId)
        t = this.currentTeam
      }
      if (!t || t.id !== teamId) return
      if (t.memberPersonIds.includes(personId)) return
      const next = [...t.memberPersonIds, personId]
      await this.updateTeam(teamId, { memberPersonIds: next })
    },

    async removeMember(teamId: string, personId: string) {
      let t = this.teams.find((x) => x.id === teamId) ?? this.currentTeam
      if (!t || t.id !== teamId) {
        await this.fetchTeam(teamId)
        t = this.currentTeam
      }
      if (!t || t.id !== teamId) return
      const next = t.memberPersonIds.filter((id) => id !== personId)
      await this.updateTeam(teamId, { memberPersonIds: next })
    },

    async reorderMembers(teamId: string, orderedPersonIds: string[]) {
      await this.updateTeam(teamId, { memberPersonIds: orderedPersonIds })
    },

    async moveMember(teamId: string, personId: string, direction: -1 | 1) {
      let t = this.teams.find((x) => x.id === teamId) ?? this.currentTeam
      if (!t || t.id !== teamId) {
        await this.fetchTeam(teamId)
        t = this.currentTeam
      }
      if (!t || t.id !== teamId) return
      const ids = [...t.memberPersonIds]
      const i = ids.indexOf(personId)
      if (i < 0) return
      const j = i + direction
      if (j < 0 || j >= ids.length) return
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      await this.updateTeam(teamId, { memberPersonIds: ids })
    },

    metaKey(accountId: string, emailId: string) {
      return `${accountId}::${emailId}`
    },

    findMetaForEmail(teamId: string, accountId: string, emailId: string): TeamMailMeta | undefined {
      const list = this.teamMailMetaByTeamId[teamId] ?? []
      return list.find((m) => m.accountId === accountId && m.emailId === emailId)
    },

    async upsertTeamMailMeta(payload: {
      teamId: string
      accountId: string
      emailId: string
      personId: string
      projectId?: string | null
    }) {
      const authStore = useAuthStore()
      if (!authStore.user) throw new Error('Not authenticated')

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) throw new Error(sessionErr)

      const db = getFirestore()
      const existing = this.findMetaForEmail(payload.teamId, payload.accountId, payload.emailId)

      try {
        if (existing) {
          const dref = doc(db, 'teamMailMeta', existing.id)
          await updateDoc(dref, {
            personId: payload.personId,
            projectId: payload.projectId ?? null,
            updatedAt: serverTimestamp(),
          })
        } else {
          await addDoc(collection(db, 'teamMailMeta'), {
            userId: authStore.user.id,
            teamId: payload.teamId,
            accountId: payload.accountId,
            emailId: payload.emailId,
            personId: payload.personId,
            projectId: payload.projectId ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        await this.fetchTeamMailMeta(payload.teamId)
      } catch (e: unknown) {
        throw new Error(formatTeamsFirestoreError(e))
      }
    },

    async deleteTeamMailMeta(metaId: string, teamId: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return

      const sessionErr = teamsFirebaseSessionError(authStore.user.id)
      if (sessionErr) {
        console.warn('deleteTeamMailMeta skipped:', sessionErr)
        return
      }

      const db = getFirestore()
      try {
        await deleteDoc(doc(db, 'teamMailMeta', metaId))
        await this.fetchTeamMailMeta(teamId)
      } catch (e: unknown) {
        console.error('deleteTeamMailMeta', formatTeamsFirestoreError(e))
        throw new Error(formatTeamsFirestoreError(e))
      }
    },
  },
})

/** Normalize email for matching */
export function normalizeEmail(e: string | undefined | null): string {
  return (e || '').trim().toLowerCase()
}

/** Resolve person column for an email: explicit meta wins, else match from.email to person */
export function resolveEmailPersonId(
  fromEmail: string,
  memberPeople: Person[],
  metaPersonId: string | null | undefined,
): string | null {
  if (metaPersonId) return metaPersonId
  const norm = normalizeEmail(fromEmail)
  const p = memberPeople.find((person) => normalizeEmail(person.email) === norm)
  return p?.id ?? null
}

/**
 * Weighted attention score (product: urgent/overdue style).
 * +1 base, +2 if unread, +2 if older than staleDays, +1 if label suggests importance
 */
export function emailAttentionWeight(
  email: { read: boolean; date: Date; labels?: string[] },
  staleDays = 7,
): number {
  let w = 1
  if (!email.read) w += 2
  const ageMs = Date.now() - email.date.getTime()
  if (ageMs > staleDays * 24 * 60 * 60 * 1000) w += 2
  const labels = (email.labels || []).map((l) => l.toUpperCase())
  if (labels.some((l) => l.includes('IMPORTANT') || l.includes('PRIORITY') || l.includes('URGENT'))) {
    w += 1
  }
  return w
}
