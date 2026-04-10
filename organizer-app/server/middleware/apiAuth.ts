import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { getAdminDb } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  // Only protect /api/v1/* routes (excluding the token issuance endpoint itself)
  const url = event.path || ''
  if (!url.startsWith('/api/v1/')) { return }
  if (url === '/api/v1/auth/token') { return } // handled by its own route with ID-token auth

  const authHeader = getRequestHeader(event, 'authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Bearer token' })
  }

  const token = match[1]

  try {
    const db = getAdminDb()
    // Query users collection for a matching apiToken
    const snapshot = await db
      .collection('users')
      .where('apiToken', '==', token)
      .limit(1)
      .get()

    if (snapshot.empty) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid API token' })
    }

    const userDoc = snapshot.docs[0]
    event.context.uid = userDoc.id
    event.context.apiAuthenticated = true
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode) { throw err }
    throw createError({ statusCode: 401, statusMessage: 'Token validation failed' })
  }
})
