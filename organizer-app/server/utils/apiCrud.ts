/**
 * Factory helpers for building standard CRUD handlers over a Firestore collection,
 * authenticated via apiAuth middleware (event.context.uid must be set).
 */
import {
  defineEventHandler,
  getQuery,
  readBody,
  createError,
  setResponseHeader
} from 'h3'
import { getAdminDb } from '~/server/utils/firebaseAdmin'

export interface CrudOptions {
  /** Firestore collection name */
  collection: string
  /** Optional field name containing the userId (default: 'userId') */
  userField?: string
}

function noCache (event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
}

/** GET (list) + POST (create) handler — mount at /api/v1/{module}/index.ts */
export function makeCrudListCreate (opts: CrudOptions) {
  const userField = opts.userField ?? 'userId'

  return defineEventHandler(async (event) => {
    noCache(event)
    const uid = event.context.uid as string
    if (!uid) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

    const db = getAdminDb()
    const col = db.collection(opts.collection)

    if (event.method === 'GET') {
      const q = getQuery(event)
      const limit = Math.min(Number(q.limit) || 50, 200)
      const offset = Number(q.offset) || 0

      const query = col.where(userField, '==', uid).orderBy('updatedAt', 'desc')
      if (offset > 0) {
        // Firestore doesn't have native offset — use limit+skip via startAfter
        // For simplicity we fetch limit+offset and slice
        const snap = await col.where(userField, '==', uid).orderBy('updatedAt', 'desc').limit(limit + offset).get()
        const docs = snap.docs.slice(offset).map(d => ({ id: d.id, ...d.data() }))
        return { data: docs, meta: { limit, offset, count: docs.length } }
      }

      const snap = await query.limit(limit).get()
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      return { data, meta: { limit, offset, count: data.length } }
    }

    if (event.method === 'POST') {
      const body = await readBody(event)
      if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
      }

      const now = new Date()
      const docData = {
        ...body,
        [userField]: uid,
        createdAt: now,
        updatedAt: now
      }
      // Remove client-supplied id if present
      delete docData.id

      const ref = await col.add(docData)
      return { data: { id: ref.id, ...docData } }
    }

    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  })
}

/** GET (one) + PUT (update) + DELETE handler — mount at /api/v1/{module}/[id].ts */
export function makeCrudItemHandler (opts: CrudOptions) {
  const userField = opts.userField ?? 'userId'

  return defineEventHandler(async (event) => {
    noCache(event)
    const uid = event.context.uid as string
    if (!uid) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

    const id = event.context.params?.id as string
    if (!id) { throw createError({ statusCode: 400, statusMessage: 'Missing id' }) }

    const db = getAdminDb()
    const docRef = db.collection(opts.collection).doc(id)
    const snap = await docRef.get()

    if (!snap.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }

    const data = snap.data()!
    if (data[userField] !== uid) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    if (event.method === 'GET') {
      return { data: { id: snap.id, ...data } }
    }

    if (event.method === 'PUT' || event.method === 'PATCH') {
      const body = await readBody(event)
      if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
      }

      const updates: Record<string, unknown> = { ...body, updatedAt: new Date() }
      delete updates.id
      delete updates[userField]
      delete updates.createdAt

      await docRef.update(updates)
      return { data: { id: snap.id, ...data, ...updates } }
    }

    if (event.method === 'DELETE') {
      await docRef.delete()
      return { data: { id: snap.id, deleted: true } }
    }

    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  })
}
