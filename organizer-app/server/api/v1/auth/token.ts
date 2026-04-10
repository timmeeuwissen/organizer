import { defineEventHandler, getRequestHeader, readBody, createError, setResponseHeader } from 'h3'
import { randomBytes } from 'node:crypto'
import { getAdminDb, getAdminAuth } from '~/server/utils/firebaseAdmin'

/**
 * POST  /api/v1/auth/token  — Issue a new API token (requires Firebase ID token)
 * DELETE /api/v1/auth/token — Revoke the current API token (requires Firebase ID token)
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  // Authenticate using Firebase ID token
  const authHeader = getRequestHeader(event, 'authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Firebase ID token' })
  }

  const idToken = match[1]
  let uid: string

  try {
    const auth = getAdminAuth()
    const decoded = await auth.verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Firebase ID token' })
  }

  const db = getAdminDb()
  const userRef = db.collection('users').doc(uid)

  if (event.method === 'DELETE') {
    await userRef.set({ apiToken: null }, { merge: true })
    return { success: true, message: 'API token revoked' }
  }

  // POST — generate new token
  const token = `org_${randomBytes(32).toString('hex')}`
  await userRef.set({ apiToken: token }, { merge: true })

  return { success: true, token }
})
