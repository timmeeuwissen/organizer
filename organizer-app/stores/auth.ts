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
    async checkAuth() {
      if (this.user) {
        return Promise.resolve(this.user)
      }
      
      return this.init()
    },

    async init() {
      const auth = getAuth()
      this.loading = true
      this.error = null
      
      return new Promise<User | null>((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, 
          async (firebaseUser) => {
            try {
              if (firebaseUser) {
                await this.setUser(firebaseUser)
                resolve(this.user)
              } else {
                this.user = null
                resolve(null)
              }
            } catch (error: any) {
              console.error('Auth state change error:', error)
              this.error = error.message || 'Authentication failed'
              reject(error)
            } finally {
              this.loading = false
              unsubscribe()
            }
          },
          (error) => {
            this.loading = false
            this.error = error.message || 'Authentication failed'
            console.error('Auth state change error:', error)
            reject(error)
            unsubscribe()
          }
        )
      })
    },

    async setUser(firebaseUser: FirebaseUser) {
      try {
        const db = getFirestore()
        const userRef = doc(db, 'users', firebaseUser.uid)
        
        try {
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
              updatedAt: new Date(),
              lastLogin: new Date(),
              settings: {
                defaultLanguage: 'en',
                darkMode: false,
                emailNotifications: true,
                calendarSync: false,
                integrationAccounts: []
              }
            }
            
            try {
              await setDoc(userRef, newUser)
              this.user = newUser
            } catch (error: any) {
              console.error('Error creating new user in Firestore:', error)
              // If we can't create the user in Firestore, still set the user from Firebase auth
              this.user = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
                settings: {
                  defaultLanguage: 'en',
                  darkMode: false,
                  emailNotifications: true,
                  calendarSync: false,
                  integrationAccounts: []
                }
              }
            }
          }
          
          // Try to update last login time
          try {
            await setDoc(userRef, { lastLogin: new Date() }, { merge: true })
          } catch (error) {
            console.error('Failed to update last login time:', error)
            // Continue even if this fails
          }
        } catch (error: any) {
          console.error('Error getting user from Firestore:', error)
          if (error.code === 'failed-precondition' || error.code === 'unavailable') {
            console.warn('Firestore unavailable, using data from authentication')
            // If Firestore is offline, use Firebase auth data
            this.user = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLogin: new Date(),
                settings: {
                  defaultLanguage: 'en',
                  darkMode: false,
                  emailNotifications: true,
                  calendarSync: false,
                  integrationAccounts: []
                }
            }
          } else {
            throw error
          }
        }
      } catch (error: any) {
        console.error('Error in setUser:', error)
        this.error = error.message || 'Failed to set user data'
        throw error
      }
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
    },
    
    async updateUserProfile(profileData: Partial<User>) {
      if (!this.user) return
      
      this.loading = true
      this.error = null
      
      try {
        // Update local state only - Firestore update should be done separately
        // This is useful for reflecting changes immediately in the UI
        this.user = {
          ...this.user,
          ...profileData,
          updatedAt: new Date()
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update profile'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
