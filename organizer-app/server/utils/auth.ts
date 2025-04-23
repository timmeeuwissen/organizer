import { H3Event } from 'h3'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import type { DecodedIdToken } from 'firebase-admin/auth'

// Define the user type that includes settings
export interface UserData {
  id: string;
  email?: string;
  displayName?: string;
  settings?: {
    aiIntegrations?: Array<{
      provider: string;
      enabled: boolean;
      apiKey: string;
      name: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  [key: string]: any;
}

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    
    if (!serviceAccount) {
      console.error('Firebase service account not provided')
      throw new Error('Firebase service account not provided')
    }
    
    try {
      // Parse the service account JSON
      const serviceAccountObj = JSON.parse(
        Buffer.from(serviceAccount, 'base64').toString()
      )
      
      initializeApp({
        credential: cert(serviceAccountObj)
      })
    } catch (error) {
      console.error('Firebase admin initialization error:', error)
      throw new Error('Failed to initialize Firebase admin')
    }
  }
}

// Get user data from Firestore
async function getUserData(uid: string) {
  try {
    const db = getFirestore()
    const userDoc = await db.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
      return null
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data()
    }
  } catch (error) {
    console.error('Error getting user data:', error)
    return null
  }
}

/**
 * Get the authentication state from the request
 */
export async function useAuthState(event: H3Event) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    
    // Get authorization header
    const authHeader = event.node.req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, user: null }
    }
    
    // Extract the token
    const token = authHeader.split('Bearer ')[1]
    
    if (!token) {
      return { authenticated: false, user: null }
    }
    
    try {
      // Verify the token
      const decodedToken = await getAuth().verifyIdToken(token)
      
      // Get the user from Firestore to include settings and other data
      const userData = await getUserData(decodedToken.uid)
      
      if (!userData) {
        return { authenticated: true, user: null }
      }
      
      return {
        authenticated: true,
        user: userData
      }
    } catch (error) {
      console.error('Token verification error:', error)
      return { authenticated: false, user: null }
    }
  } catch (error) {
    console.error('Auth state error:', error)
    return { authenticated: false, user: null }
  }
}

/**
 * Check if a user is authenticated and get their user record
 */
export async function requireAuth(event: H3Event): Promise<UserData> {
  const { authenticated, user } = await useAuthState(event)
  
  if (!authenticated || !user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }
  
  return user
}

/**
 * Create an error with the specified status code and message
 */
export function createError({ statusCode, message }: { statusCode: number; message: string }) {
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = statusCode
  return error
}
