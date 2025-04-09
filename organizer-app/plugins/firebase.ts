import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  
  // Log Firebase configuration (without sensitive values)
  console.log('Firebase config:', {
    authDomain: config.public.firebase.authDomain,
    projectId: config.public.firebase.projectId,
    storageBucket: config.public.firebase.storageBucket,
    messagingSenderId: config.public.firebase.messagingSenderId,
    measurementId: config.public.firebase.measurementId,
    apiKey: config.public.firebase.apiKey ? '***** (set)' : '***** (not set)',
    appId: config.public.firebase.appId ? '***** (set)' : '***** (not set)',
  });
  
  // Initialize Firebase with the config from runtime config
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
