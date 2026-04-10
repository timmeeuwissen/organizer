import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
  , getFirestore
} from 'firebase/firestore'
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import { useNuxtApp } from '#app'
import { useAuthStore } from './auth'
import type { ProjectLink, ProjectFile, ProjectMailLink } from '~/types/models/projectAttachments'
import { normalizeProjectUrl, isValidHttpUrlForProject } from '~/utils/normalizeProjectUrl'

function mapLinkDoc (id: string, data: Record<string, unknown>): ProjectLink {
  return {
    id,
    userId: String(data.userId ?? ''),
    projectId: String(data.projectId ?? ''),
    url: String(data.url ?? ''),
    title: data.title != null ? String(data.title) : undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
  }
}

function mapFileDoc (id: string, data: Record<string, unknown>): ProjectFile {
  return {
    id,
    userId: String(data.userId ?? ''),
    projectId: String(data.projectId ?? ''),
    storagePath: String(data.storagePath ?? ''),
    name: String(data.name ?? ''),
    mimeType: String(data.mimeType ?? ''),
    size: Number(data.size ?? 0),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
  }
}

function mapMailLinkDoc (id: string, data: Record<string, unknown>): ProjectMailLink {
  return {
    id,
    userId: String(data.userId ?? ''),
    projectId: String(data.projectId ?? ''),
    accountId: String(data.accountId ?? ''),
    emailId: String(data.emailId ?? ''),
    subjectSnapshot:
      data.subjectSnapshot != null ? String(data.subjectSnapshot) : undefined,
    fromSnapshot: data.fromSnapshot != null ? String(data.fromSnapshot) : undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
  }
}

function formatError (e: unknown): string {
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
  const base = e instanceof Error ? e.message : 'Request failed'
  if (code === 'permission-denied') {
    return `${base} Check Firestore rules and sign-in.`
  }
  return base
}

function isMissingIndexError (e: unknown): boolean {
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
  return code === 'failed-precondition'
}

function sortByCreatedDesc<T extends { createdAt: Date }> (rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const useProjectAttachmentsStore = defineStore('projectAttachments', {
  state: () => ({
    linksByProjectId: {} as Record<string, ProjectLink[]>,
    filesByProjectId: {} as Record<string, ProjectFile[]>,
    mailLinksByProjectId: {} as Record<string, ProjectMailLink[]>,
    mailLinksByMessageKey: {} as Record<string, ProjectMailLink[]>,
    loading: false,
    error: null as string | null
  }),

  getters: {
    linksForProject:
      storeState =>
        (projectId: string): ProjectLink[] =>
          storeState.linksByProjectId[projectId] ?? [],
    filesForProject:
      storeState =>
        (projectId: string): ProjectFile[] =>
          storeState.filesByProjectId[projectId] ?? [],
    mailLinksForProject:
      storeState =>
        (projectId: string): ProjectMailLink[] =>
          storeState.mailLinksByProjectId[projectId] ?? [],
    mailLinksForMessage:
      storeState =>
        (accountId: string, emailId: string): ProjectMailLink[] => {
          const key = messageKey(accountId, emailId)
          return storeState.mailLinksByMessageKey[key] ?? []
        }
  },

  actions: {
    async fetchForProject (projectId: string) {
      const authStore = useAuthStore()
      if (!authStore.user) { throw new Error('Not signed in') }

      this.loading = true
      this.error = null
      const uid = authStore.user.id
      const db = getFirestore()

      try {
        const fetchScoped = async (name: 'projectLinks' | 'projectFiles' | 'projectMailLinks') => {
          try {
            return await getDocs(
              query(
                collection(db, name),
                where('userId', '==', uid),
                where('projectId', '==', projectId),
                orderBy('createdAt', 'desc')
              )
            )
          } catch (e) {
            if (!isMissingIndexError(e)) { throw e }
            // Fallback path avoids composite index requirement.
            return getDocs(
              query(
                collection(db, name),
                where('userId', '==', uid),
                where('projectId', '==', projectId)
              )
            )
          }
        }

        const [linksSnap, filesSnap, mailSnap] = await Promise.all([
          fetchScoped('projectLinks'),
          fetchScoped('projectFiles'),
          fetchScoped('projectMailLinks')
        ])

        this.linksByProjectId[projectId] = sortByCreatedDesc(linksSnap.docs.map(d =>
          mapLinkDoc(d.id, d.data() as Record<string, unknown>)
        ))
        this.filesByProjectId[projectId] = sortByCreatedDesc(filesSnap.docs.map(d =>
          mapFileDoc(d.id, d.data() as Record<string, unknown>)
        ))
        this.mailLinksByProjectId[projectId] = sortByCreatedDesc(mailSnap.docs.map(d =>
          mapMailLinkDoc(d.id, d.data() as Record<string, unknown>)
        ))
      } catch (e: unknown) {
        this.error = formatError(e)
        console.error(e)
        throw new Error(this.error)
      } finally {
        this.loading = false
      }
    },

    async fetchMailLinksForMessage (accountId: string, emailId: string) {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      const key = messageKey(accountId, emailId)
      this.loading = true
      this.error = null
      try {
        const db = getFirestore()
        const q = query(
          collection(db, 'projectMailLinks'),
          where('userId', '==', authStore.user.id),
          where('accountId', '==', accountId),
          where('emailId', '==', emailId)
        )
        const snap = await getDocs(q)
        this.mailLinksByMessageKey[key] = snap.docs.map(d =>
          mapMailLinkDoc(d.id, d.data() as Record<string, unknown>)
        )
      } catch (e: unknown) {
        this.error = formatError(e)
        console.error(e)
      } finally {
        this.loading = false
      }
    },

    async addLink (projectId: string, rawUrl: string, title?: string) {
      const authStore = useAuthStore()
      if (!authStore.user) { throw new Error('Not signed in') }

      if (!isValidHttpUrlForProject(rawUrl)) {
        throw new Error('Invalid URL')
      }
      const url = normalizeProjectUrl(rawUrl)
      const db = getFirestore()
      const ref = doc(collection(db, 'projectLinks'))
      await setDoc(ref, {
        userId: authStore.user.id,
        projectId,
        url,
        title: title?.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      // Optimistic local insert for immediate visibility.
      const current = this.linksByProjectId[projectId] ?? []
      const optimistic: ProjectLink = {
        id: ref.id,
        userId: authStore.user.id,
        projectId,
        url,
        title: title?.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      this.linksByProjectId[projectId] = [optimistic, ...current]
      await this.fetchForProject(projectId)
      return ref.id
    },

    async deleteLink (projectId: string, linkId: string) {
      const db = getFirestore()
      await deleteDoc(doc(db, 'projectLinks', linkId))
      await this.fetchForProject(projectId)
    },

    async updateLink (projectId: string, linkId: string, rawUrl: string, title?: string) {
      const authStore = useAuthStore()
      if (!authStore.user) { throw new Error('Not signed in') }
      if (!isValidHttpUrlForProject(rawUrl)) { throw new Error('Invalid URL') }

      const url = normalizeProjectUrl(rawUrl)
      const db = getFirestore()
      await setDoc(
        doc(db, 'projectLinks', linkId),
        {
          userId: authStore.user.id,
          projectId,
          url,
          title: title?.trim() || null,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
      await this.fetchForProject(projectId)
    },

    async addMailLink (
      projectId: string,
      accountId: string,
      emailId: string,
      snapshots?: { subject?: string; from?: string }
    ) {
      const authStore = useAuthStore()
      if (!authStore.user) { throw new Error('Not signed in') }

      const db = getFirestore()
      const dupQ = query(
        collection(db, 'projectMailLinks'),
        where('userId', '==', authStore.user.id),
        where('accountId', '==', accountId),
        where('emailId', '==', emailId)
      )
      const existing = await getDocs(dupQ)
      const dupDoc = existing.docs.find(
        d => (d.data() as { projectId?: string }).projectId === projectId
      )
      if (dupDoc) {
        return dupDoc.id
      }

      const ref = doc(collection(db, 'projectMailLinks'))
      await setDoc(ref, {
        userId: authStore.user.id,
        projectId,
        accountId,
        emailId,
        subjectSnapshot: snapshots?.subject ?? null,
        fromSnapshot: snapshots?.from ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      await this.fetchForProject(projectId)
      await this.fetchMailLinksForMessage(accountId, emailId)
      return ref.id
    },

    async deleteMailLink (
      projectId: string,
      linkId: string,
      accountId: string,
      emailId: string
    ) {
      const db = getFirestore()
      await deleteDoc(doc(db, 'projectMailLinks', linkId))
      await this.fetchForProject(projectId)
      await this.fetchMailLinksForMessage(accountId, emailId)
    },

    async uploadFile (projectId: string, file: File) {
      const authStore = useAuthStore()
      if (!authStore.user) { throw new Error('Not signed in') }

      const nuxtApp = useNuxtApp()
      const storage = nuxtApp.$storage
      if (!storage) {
        throw new Error('File storage is not configured (Firebase Storage bucket missing or demo mode).')
      }

      const maxBytes = useRuntimeConfig().public.projectFileMaxBytes as number
      if (file.size > maxBytes) {
        throw new Error(`File exceeds maximum size (${Math.round(maxBytes / (1024 * 1024))} MB).`)
      }

      const db = getFirestore()
      const fileDocRef = doc(collection(db, 'projectFiles'))
      const fileId = fileDocRef.id
      const uid = authStore.user.id
      const path = `users/${uid}/projects/${projectId}/${fileId}`

      const sRef = storageRef(storage, path)
      await uploadBytes(sRef, file, { contentType: file.type || 'application/octet-stream' })

      await setDoc(fileDocRef, {
        userId: uid,
        projectId,
        storagePath: path,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      await this.fetchForProject(projectId)
      return fileId
    },

    async getFileDownloadUrl (storagePath: string): Promise<string> {
      const nuxtApp = useNuxtApp()
      const storage = nuxtApp.$storage
      if (!storage) { throw new Error('Storage not available') }
      return getDownloadURL(storageRef(storage, storagePath))
    },

    async deleteFile (projectId: string, fileMeta: ProjectFile) {
      const nuxtApp = useNuxtApp()
      const storage = nuxtApp.$storage
      if (storage && fileMeta.storagePath) {
        try {
          await deleteObject(storageRef(storage, fileMeta.storagePath))
        } catch (e: unknown) {
          const code =
            e && typeof e === 'object' && 'code' in e
              ? String((e as { code: string }).code)
              : ''
          if (code !== 'storage/object-not-found') {
            throw e
          }
        }
      }
      const db = getFirestore()
      await deleteDoc(doc(db, 'projectFiles', fileMeta.id))
      await this.fetchForProject(projectId)
    }
  }
})

function messageKey (accountId: string, emailId: string) {
  return `${accountId}:${emailId}`
}
