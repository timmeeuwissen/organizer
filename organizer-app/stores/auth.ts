import { defineStore } from 'pinia'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import type { User, UserSettings } from '~/types/models'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: true,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user,
  },

  actions: {
    async init() {
      const auth = getAuth()
      this.loading = true
      
      return new Promise<void>((resolve) => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            await this.setUser(firebaseUser)
          } else {
            this.user = null
          }
          this.loading = false
          resolve()
        })
      })
    },

    async setUser(firebaseUser: FirebaseUser) {
      const db = getFirestore()
      const userRef = doc(db, 'users', firebaseUser.uid)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists()) {
        // User exists in Firestore, use that data
        this.user = userSnap.data() as User
      } else {
        // New user, create in Firestore
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: new Date(),
          lastLogin: new Date(),
          settings: {
            defaultLanguage: 'en',
            darkMode: false,
            emailNotifications: true,
            calendarSync: false
          }
        }
        
        await setDoc(userRef, newUser)
        this.user = newUser
      }
      
      // Update last login time
      await setDoc(userRef, { lastLogin: new Date() }, { merge: true })
    },

    async loginWithEmail(email: string, password: string) {
      this.loading = true
      this.error = null
      
      try {
        const auth = getAuth()
        const { user } = await signInWithEmailAndPassword(auth, email, password)
        await this.setUser(user)
      } catch (error: any) {
        this.error = error.message || 'Login failed'
        throw error
      } finally {
        this.loading = false
      }
    },

    async registerWithEmail(email: string, password: string) {
      this.loading = true
      this.error = null
      
      try {
        const auth = getAuth()
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        await this.setUser(user)
      } catch (error: any) {
        this.error = error.message || 'Registration failed'
        throw error
      } finally {
        this.loading = false
      }
    },

    async loginWithGoogle() {
      this.loading = true
      this.error = null
      
      try {
        const auth = getAuth()
        const provider = new GoogleAuthProvider()
        const { user } = await signInWithPopup(auth, provider)
        await this.setUser(user)
      } catch (error: any) {
        this.error = error.message || 'Google login failed'
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.loading = true
      this.error = null
      
      try {
        const auth = getAuth()
        await signOut(auth)
        this.user = null
      } catch (error: any) {
        this.error = error.message || 'Logout failed'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateUserSettings(settings: Partial<UserSettings>) {
      if (!this.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const userRef = doc(db, 'users', this.user.id)
        
        const updatedSettings = {
          ...this.user.settings,
          ...settings
        }
        
        await setDoc(userRef, { settings: updatedSettings }, { merge: true })
        
        this.user = {
          ...this.user,
          settings: updatedSettings as UserSettings
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update settings'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
