import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  
  // Check if we're in development mode
  const isDev = import.meta.env.DEV
  
  // Check for localStorage demo mode setting first (takes precedence over env variable)
  let bypassAuth = false
  
  // Only run this code in browser environment
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const storedDemoMode = localStorage.getItem('demoMode')
    if (storedDemoMode !== null) {
      bypassAuth = storedDemoMode === 'true'
    } else {
      // Use env variable as fallback
      bypassAuth = isDev && import.meta.env.VITE_AUTH_BYPASS === 'true'
    }
  } else {
    // In SSR context, use env variable
    bypassAuth = isDev && import.meta.env.VITE_AUTH_BYPASS === 'true'
  }
  
  // Log Firebase configuration (without sensitive values)
  console.log('Firebase config:', {
    authDomain: config.public.firebase.authDomain,
    projectId: config.public.firebase.projectId,
    storageBucket: config.public.firebase.storageBucket,
    messagingSenderId: config.public.firebase.messagingSenderId,
    measurementId: config.public.firebase.measurementId,
    apiKey: config.public.firebase.apiKey ? '***** (set)' : '***** (not set)',
    appId: config.public.firebase.appId ? '***** (set)' : '***** (not set)',
    devMode: isDev,
    authBypass: bypassAuth,
    demoModeSetting: typeof window !== 'undefined' ? localStorage.getItem('demoMode') : 'unavailable in SSR'
  });
  
  // For development with auth bypass, use mock Firebase services
  if (bypassAuth) {
    console.log('Using mock Firebase services in development mode with auth bypass')
    
    // Create mock Firebase services
    const mockApp = { name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false }
    
    // Mock Auth service
    const mockAuth = {
      currentUser: null,
      onAuthStateChanged: (callback: any) => {
        // Immediately trigger the callback with null (not authenticated)
        callback(null)
        // Return a function that does nothing when called (unsubscribe)
        return () => {}
      },
      signOut: () => Promise.resolve(),
      signInWithEmailAndPassword: () => Promise.resolve({ user: null }),
      createUserWithEmailAndPassword: () => Promise.resolve({ user: null }),
      signInWithPopup: () => Promise.resolve({ user: null })
    }
    
    // Mock Firestore service with in-memory storage
    const mockDB = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.resolve({ exists: false, data: () => ({}) }),
          set: () => Promise.resolve()
        })
      }),
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => ({}) }),
        set: () => Promise.resolve()
      })
    }
    
    // Provide mock services to the app
    nuxtApp.provide('firebase', mockApp)
    nuxtApp.provide('auth', mockAuth)
    nuxtApp.provide('firestore', mockDB)
    
    console.log('Mock Firebase initialized for development')
    return
  }
  
  // Real Firebase initialization for production or when bypass is not enabled
  const firebaseConfig = {
    apiKey: config.public.firebase.apiKey,
    authDomain: config.public.firebase.authDomain,
    projectId: config.public.firebase.projectId,
    storageBucket: config.public.firebase.storageBucket,
    messagingSenderId: config.public.firebase.messagingSenderId,
    appId: config.public.firebase.appId,
    measurementId: config.public.firebase.measurementId
  }
  
  try {
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const firestore = getFirestore(app)
    
    // Enable offline persistence for Firestore
    try {
      await enableIndexedDbPersistence(firestore)
      console.log('Firestore offline persistence enabled')
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore offline persistence could not be enabled: multiple tabs open')
      } else if (error.code === 'unimplemented') {
        console.warn('Firestore offline persistence not available in this browser')
      } else {
        console.error('Error enabling Firestore offline persistence:', error)
      }
    }

    // Provide Firebase services to the app
    nuxtApp.provide('firebase', app)
    nuxtApp.provide('auth', auth)
    nuxtApp.provide('firestore', firestore)
    
    console.log('Firebase initialized successfully')
  } catch (error) {
    console.error('Error initializing Firebase:', error)
  }
})
