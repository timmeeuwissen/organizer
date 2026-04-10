import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

let _app: App | null = null

function getAdminApp (): App {
  if (_app) { return _app }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set')
  }

  let serviceAccount: Parameters<typeof cert>[0]
  try {
    serviceAccount = JSON.parse(serviceAccountKey) as Parameters<typeof cert>[0]
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON')
  }

  const existing = getApps()
  if (existing.length > 0) {
    _app = existing[0]
  } else {
    _app = initializeApp({ credential: cert(serviceAccount) })
  }

  return _app
}

export function getAdminDb (): Firestore {
  return getFirestore(getAdminApp())
}

export function getAdminAuth (): Auth {
  return getAuth(getAdminApp())
}
