import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'

declare module '#app' {
  interface NuxtApp {
    $firebase: FirebaseApp
    $auth: Auth
    $firestore: Firestore
    $storage: FirebaseStorage | null
  }
}

export {}
