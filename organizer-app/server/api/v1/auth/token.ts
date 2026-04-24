import { defineEventHandler, getRequestHeader, createError, setResponseHeader } from 'h3'
import { randomBytes } from 'node:crypto'

interface TokenLookupResponse {
  users: Array<{ localId: string }>
}

/**
 * POST  /api/v1/auth/token  — Issue a new API token (requires Firebase ID token)
 * DELETE /api/v1/auth/token — Revoke the current API token (requires Firebase ID token)
 *
 * Identity verified via Firebase Identity Toolkit REST API — no service account key required.
 * Firestore writes use the caller's ID token as auth credential, so Firestore security rules apply.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const authHeader = getRequestHeader(event, 'authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Firebase ID token' })
  }

  const idToken = match[1]
  const config = useRuntimeConfig()
  const { apiKey, projectId } = config.public.firebase

  // Verify Firebase ID token via public Identity Toolkit endpoint — no service account needed
  let uid: string
  try {
    const res = await $fetch<TokenLookupResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      { method: 'POST', body: { idToken } }
    )
    const localId = res.users?.[0]?.localId
    if (!localId) throw new Error('No user returned from token lookup')
    uid = localId
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Firebase ID token' })
  }

  // Write to Firestore REST API authenticated with the user's own ID token
  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=apiToken`
  const headers = { Authorization: `Bearer ${idToken}` }

  if (event.method === 'DELETE') {
    await $fetch(docUrl, {
      method: 'PATCH',
      headers,
      body: { fields: { apiToken: { nullValue: null } } }
    })
    return { success: true, message: 'API token revoked' }
  }

  // POST — generate and store new app-level token
  const token = `org_${randomBytes(32).toString('hex')}`
  await $fetch(docUrl, {
    method: 'PATCH',
    headers,
    body: { fields: { apiToken: { stringValue: token } } }
  })

  return { success: true, token }
})
