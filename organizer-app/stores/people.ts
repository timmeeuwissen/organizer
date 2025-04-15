import { defineStore } from 'pinia'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuthStore } from './auth'
import type { Person, IntegrationAccount } from '~/types/models'
import { createContactsProvider } from '~/utils/api/contactProviders'

export const usePeopleStore = defineStore({
  id: 'people',
  
  state: () => ({
    people: [] as Person[],
    currentPerson: null as Person | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getById: (state) => (id: string) => {
      return state.people.find(person => person.id === id) || null
    },
    getRecentlyContacted: (state) => (limit: number = 5) => {
      return [...state.people]
        .filter(person => person.lastContacted)
        .sort((a, b) => {
          const dateA = a.lastContacted ? a.lastContacted.getTime() : 0
          const dateB = b.lastContacted ? b.lastContacted.getTime() : 0
          return dateB - dateA
        })
        .slice(0, limit)
    },
    getByOrganization: (state) => (organization: string) => {
      return state.people.filter(person => person.organization === organization)
    },
    getByTeam: (state) => (team: string) => {
      return state.people.filter(person => person.team === team)
    },
    getByRole: (state) => (role: string) => {
      return state.people.filter(person => person.role === role)
    }
  },

  actions: {
    async fetchPeople() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const peopleRef = collection(db, 'people')
        const q = query(
          peopleRef, 
          where('userId', '==', authStore.user.id),
          orderBy('lastName')
        )
        const querySnapshot = await getDocs(q)
        
        this.people = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            lastContacted: data.lastContacted?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Person
        })
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch people'
        console.error('Error fetching people:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchPerson(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const personRef = doc(db, 'people', id)
        const personSnap = await getDoc(personRef)
        
        if (personSnap.exists()) {
          const data = personSnap.data()
          
          // Ensure this person belongs to the current user
          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to person')
          }
          
          this.currentPerson = {
            ...data,
            id: personSnap.id,
            lastContacted: data.lastContacted?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Person
        } else {
          this.error = 'Person not found'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch person'
        console.error('Error fetching person:', error)
      } finally {
        this.loading = false
      }
    },

    async createPerson(newPerson: Partial<Person>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const peopleRef = collection(db, 'people')
        
        const personData = {
          ...newPerson,
          userId: authStore.user.id,
          // Set default values for related items
          relatedMeetings: [],
          relatedProjects: newPerson.relatedProjects || [],
          relatedTasks: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        const docRef = await addDoc(peopleRef, personData)
        
        // Add the new person to the local state
        const addedPerson = {
          ...personData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Person
        
        this.people.push(addedPerson)
        this.currentPerson = addedPerson
        
        return docRef.id
      } catch (error: any) {
        this.error = error.message || 'Failed to create person'
        console.error('Error creating person:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePerson(id: string, updates: Partial<Person>) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const personRef = doc(db, 'people', id)
        
        // First, get the person to verify ownership
        const personSnap = await getDoc(personRef)
        
        if (!personSnap.exists()) {
          throw new Error('Person not found')
        }
        
        const personData = personSnap.data()
        
        // Ensure this person belongs to the current user
        if (personData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to person')
        }
        
        // Prepare update data
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp(),
        }
        
        // Remove fields that shouldn't be directly updated
        delete updateData.id
        delete updateData.userId
        delete updateData.createdAt
        
        await updateDoc(personRef, updateData)
        
        // Update local state
        const index = this.people.findIndex(p => p.id === id)
        if (index !== -1) {
          this.people[index] = {
            ...this.people[index],
            ...updates,
            updatedAt: new Date(),
          }
        }
        
        // Update current person if it's the one being edited
        if (this.currentPerson && this.currentPerson.id === id) {
          this.currentPerson = {
            ...this.currentPerson,
            ...updates,
            updatedAt: new Date(),
          }
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update person'
        console.error('Error updating person:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deletePerson(id: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      this.loading = true
      this.error = null
      
      try {
        const db = getFirestore()
        const personRef = doc(db, 'people', id)
        
        // First, get the person to verify ownership
        const personSnap = await getDoc(personRef)
        
        if (!personSnap.exists()) {
          throw new Error('Person not found')
        }
        
        const personData = personSnap.data()
        
        // Ensure this person belongs to the current user
        if (personData.userId !== authStore.user.id) {
          throw new Error('Unauthorized access to person')
        }
        
        await deleteDoc(personRef)
        
        // Update local state
        this.people = this.people.filter(p => p.id !== id)
        
        // Clear current person if it was the one deleted
        if (this.currentPerson && this.currentPerson.id === id) {
          this.currentPerson = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete person'
        console.error('Error deleting person:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateLastContactDate(id: string, date: Date = new Date()) {
      const person = this.getById(id)
      if (!person) {
        this.error = 'Person not found'
        return
      }
      
      return this.updatePerson(id, { lastContacted: date })
    },

    /**
     * Fetch contacts from the specified integration account
     * @param account The integration account to fetch contacts from
     * @param query Optional query parameters
     * @param pagination Optional pagination parameters
     */
    async fetchContactsFromProvider(
      account: IntegrationAccount, 
      query?: any, 
      pagination?: { page: number, pageSize: number }
    ) {
      this.loading = true
      this.error = null
      
      try {
        // Create the appropriate provider
        const provider = createContactsProvider(account)
        
        // Authenticate with the provider
        const authenticated = await provider.authenticate()
        if (!authenticated) {
          throw new Error(`Failed to authenticate with ${account.type} contacts provider`)
        }
        
        // Fetch contacts
        const result = await provider.fetchContacts(query, pagination)
        
        // Return contacts from this provider
        return result
      } catch (error: any) {
        this.error = error.message || `Failed to fetch contacts from ${account.type} provider`
        console.error(`Error fetching contacts from ${account.type} provider:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Synchronize contacts from all enabled integration accounts
     */
    /**
     * Merge contacts from provider into the local store
     * @param providerContacts Contacts from the provider
     * @param accountId The account ID these contacts came from
     */
    mergeProviderContacts(providerContacts: Person[], accountId: string) {
      // For now, just log the contact count - in a real implementation, we would:
      // 1. Match contacts with existing contacts by email or other identifiers
      // 2. Update existing contacts with new information from provider
      // 3. Add new contacts with provenance information
      // 4. Potentially handle deletion of contacts that no longer exist in the provider
      console.log(`Would merge ${providerContacts.length} contacts from account ${accountId}`)
      
      // Simulated implementation (comments only)
      // - Contacts from providers could be stored with a "providerId" field
      // - Matching could be done on email address
      // - We could store the original provider ID to allow updates/deletes
      // - Sync conflicts could be resolved based on update timestamps
    },

    async syncContactsFromAllProviders() {
      const authStore = useAuthStore()
      if (!authStore.user || !authStore.user.settings) return
      
      this.loading = true
      this.error = null
      
      try {
        const enabledAccounts = authStore.user.settings.integrationAccounts.filter(
          account => account.syncContacts && account.showInContacts
        )
        
        for (const account of enabledAccounts) {
          try {
            const result = await this.fetchContactsFromProvider(account)
            
            // Process and merge the contacts
            this.mergeProviderContacts(result.contacts, account.id)
            console.log(`Synced ${result.contacts.length} contacts from ${account.type} account (${account.oauthData.email})`)
          } catch (error) {
            console.error(`Error syncing contacts from ${account.type} account:`, error)
            // Continue with other accounts even if one fails
          }
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to sync contacts from providers'
        console.error('Error syncing contacts from providers:', error)
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Create a contact on the provider
     * @param account The integration account
     * @param contact The contact to create
     */
    async createContactOnProvider(account: IntegrationAccount, contact: Partial<Person>) {
      this.loading = true
      this.error = null
      
      try {
        const provider = createContactsProvider(account)
        
        const authenticated = await provider.authenticate()
        if (!authenticated) {
          throw new Error(`Failed to authenticate with ${account.type} contacts provider`)
        }
        
        return await provider.createContact(contact)
      } catch (error: any) {
        this.error = error.message || `Failed to create contact on ${account.type} provider`
        console.error(`Error creating contact on ${account.type} provider:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Update a contact on the provider
     * @param account The integration account
     * @param contactId The contact ID on the provider
     * @param updates The contact updates
     */
    async updateContactOnProvider(account: IntegrationAccount, contactId: string, updates: Partial<Person>) {
      this.loading = true
      this.error = null
      
      try {
        const provider = createContactsProvider(account)
        
        const authenticated = await provider.authenticate()
        if (!authenticated) {
          throw new Error(`Failed to authenticate with ${account.type} contacts provider`)
        }
        
        return await provider.updateContact(contactId, updates)
      } catch (error: any) {
        this.error = error.message || `Failed to update contact on ${account.type} provider`
        console.error(`Error updating contact on ${account.type} provider:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Delete a contact on the provider
     * @param account The integration account
     * @param contactId The contact ID on the provider
     */
    async deleteContactOnProvider(account: IntegrationAccount, contactId: string) {
      this.loading = true
      this.error = null
      
      try {
        const provider = createContactsProvider(account)
        
        const authenticated = await provider.authenticate()
        if (!authenticated) {
          throw new Error(`Failed to authenticate with ${account.type} contacts provider`)
        }
        
        return await provider.deleteContact(contactId)
      } catch (error: any) {
        this.error = error.message || `Failed to delete contact on ${account.type} provider`
        console.error(`Error deleting contact on ${account.type} provider:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Get contact groups from the provider
     * @param account The integration account
     */
    async getContactGroupsFromProvider(account: IntegrationAccount) {
      this.loading = true
      this.error = null
      
      try {
        const provider = createContactsProvider(account)
        
        const authenticated = await provider.authenticate()
        if (!authenticated) {
          throw new Error(`Failed to authenticate with ${account.type} contacts provider`)
        }
        
        return await provider.getContactGroups()
      } catch (error: any) {
        this.error = error.message || `Failed to get contact groups from ${account.type} provider`
        console.error(`Error getting contact groups from ${account.type} provider:`, error)
        throw error
      } finally {
        this.loading = false
      }
    }
  },
  
  persist: true
})
