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
  orderBy,
  setDoc
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
     * Fetch contacts from the specified integration account and update the store
     * @param account The integration account to fetch contacts from
     * @param query Optional query parameters
     * @param pagination Optional pagination parameters
     * @param updateStore Whether to update the store with the fetched contacts (default: true)
     */
    async fetchContactsFromProvider(
      account: IntegrationAccount, 
      query?: any, 
      pagination?: { page: number, pageSize: number },
      updateStore: boolean = true
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
        
        console.log(`[People] Fetched ${result.contacts.length} contacts from ${account.type} provider (${account.oauthData.email})`)
        
        // Optionally update the store directly with the fetched contacts
        if (updateStore && result.contacts.length > 0) {
          // Mark these as provider contacts by setting the provider account ID
          const providerContacts = result.contacts.map(contact => ({
            ...contact,
            providerAccountId: account.id
          }))
          
          // Merge into store and database
          await this.mergeProviderContacts(providerContacts, account.id)
        }
        
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
     * Merge contacts from provider into the local store
     * @param providerContacts Contacts from the provider
     * @param accountId The account ID these contacts came from
     */
    /**
     * Merge contacts from provider into the local store and database
     * @param providerContacts Contacts from the provider
     * @param accountId The account ID these contacts came from
     */
    async mergeProviderContacts(providerContacts: Person[], accountId: string) {
      const authStore = useAuthStore()
      if (!authStore.user) return
      
      const userId = authStore.user.id
      
      // Get Firestore DB reference
      const db = getFirestore()
      
      // Store for tracking which contacts were processed
      const processedProviderIds = new Set<string>()
      const updatedContacts: Person[] = []
      const newContacts: Person[] = []
      
      for (const providerContact of providerContacts) {
        // Keep track of which contacts we've processed
        if (providerContact.id) {
          processedProviderIds.add(providerContact.id)
        }
        
        // Skip contacts without required fields
        if (!providerContact.firstName && !providerContact.lastName && !providerContact.email) {
          console.log('Skipping contact with insufficient information')
          continue
        }
        
        // Try to find an existing contact with the same email or same provider ID
        let existingContact = null
        
        if (providerContact.email) {
          // Look for a match by email
          existingContact = this.people.find(p => 
            p.email === providerContact.email &&
            // Optionally check for providerId if it exists
            (!p.providerId || p.providerId === providerContact.id)
          )
        }
        
        if (!existingContact && providerContact.id) {
          // Look for a match by provider ID
          existingContact = this.people.find(p => 
            p.providerId === providerContact.id && 
            p.providerAccountId === accountId
          )
        }
        
        if (existingContact) {
          // Update existing contact with new provider data
          // Note: We're using a simple "provider data wins" strategy here
          // A real implementation might have more sophisticated conflict resolution
          
          const updates: Partial<Person> = {
            // Only update provider-specific fields if this is the same provider
            // Otherwise keep existing data
            firstName: providerContact.firstName || existingContact.firstName,
            lastName: providerContact.lastName || existingContact.lastName,
            email: providerContact.email || existingContact.email,
            phone: providerContact.phone || existingContact.phone,
            organization: providerContact.organization || existingContact.organization,
            role: providerContact.role || existingContact.role,
            tags: [...new Set([...(existingContact.tags || []), ...(providerContact.tags || [])])],
            providerId: providerContact.id,
            providerAccountId: accountId,
            providerUpdatedAt: new Date(),
            updatedAt: new Date()
          }
          
          // Update the contact in the local store
          const index = this.people.findIndex(p => p.id === existingContact.id)
          if (index !== -1) {
            this.people[index] = {
              ...this.people[index],
              ...updates
            }
            
            updatedContacts.push(this.people[index])
            console.log(`Updated existing contact: ${existingContact.firstName} ${existingContact.lastName}`)
          }
        } else {
          // Create a new contact with provider data
          const newContact: Person = {
            id: providerContact.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            userId: userId,
            firstName: providerContact.firstName || '',
            lastName: providerContact.lastName || '',
            email: providerContact.email,
            phone: providerContact.phone,
            organization: providerContact.organization,
            role: providerContact.role,
            tags: providerContact.tags || [],
            providerId: providerContact.id,
            providerAccountId: accountId,
            providerUpdatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            relatedMeetings: [],
            relatedProjects: [],
            relatedTasks: []
          }
          
          // Add to local state and mark for database insertion
          this.people.push(newContact)
          newContacts.push(newContact)
          console.log(`Added new contact from provider: ${newContact.firstName} ${newContact.lastName}`)
        }
      }
      
      // Save changes to the database
      try {
        // Update existing contacts in Firestore
        const updatePromises = updatedContacts.map(async (contact) => {
          const contactRef = doc(db, 'people', contact.id)
          
          // Prepare update data - convert to a plain object
          const { id, ...updateData } = contact
          
          // Handle timestamps and convert any undefined values to null
          const firestoreData = {
            ...updateData,
            // Convert undefined values to null for Firestore
            phone: updateData.phone ?? null,
            email: updateData.email ?? null,
            organization: updateData.organization ?? null,
            role: updateData.role ?? null,
            team: updateData.team ?? null,
            notes: updateData.notes ?? null,
            updatedAt: serverTimestamp()
          }
          
          return updateDoc(contactRef, firestoreData)
        })
        
        // Add new contacts to Firestore
        const addPromises = newContacts.map(async (contact) => {
          // Extract ID and prepare data
          const { id, ...contactData } = contact
          
          // Convert dates to Firestore timestamps and undefined values to null
          const firestoreData = {
            ...contactData,
            // Convert undefined values to null for Firestore
            phone: contactData.phone ?? null,
            email: contactData.email ?? null,
            organization: contactData.organization ?? null,
            role: contactData.role ?? null,
            team: contactData.team ?? null,
            notes: contactData.notes ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
          
          // Create with specific ID
          const contactRef = doc(db, 'people', id)
          return setDoc(contactRef, firestoreData)
        })
        
        // Wait for all database operations to complete
        await Promise.all([...updatePromises, ...addPromises])
        
        console.log(`Saved ${updatedContacts.length} updated and ${newContacts.length} new contacts to database`)
      } catch (error) {
        console.error('Error saving contacts to database:', error)
      }
      
      console.log(`Merged ${processedProviderIds.size} contacts from account ${accountId}`)
      
      // In a real implementation, we might also handle deletions:
      // - Find contacts with providerAccountId = accountId but not in processedProviderIds
      // - Either delete them or mark them as deleted
    },

    /**
     * Synchronize contacts from all enabled integration accounts
     * This function handles pagination to make sure all contacts are fetched
     */
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
            let totalContactsFetched = 0
            let currentPage = 0
            let hasMorePages = true
            const pageSize = 50 // Fetch 50 contacts per page
            
            console.log(`Starting contact sync from ${account.type} account (${account.oauthData.email})`)
            
            // Continue fetching pages until there are no more
            while (hasMorePages) {
              // Fetch the current page of contacts
              const result = await this.fetchContactsFromProvider(
                account, 
                undefined, 
                { page: currentPage, pageSize }, 
                true
              )
              
              totalContactsFetched += result.contacts.length
              console.log(`Fetched page ${currentPage + 1} with ${result.contacts.length} contacts from ${account.type} account (${account.oauthData.email})`)
              
              // Check if there are more pages
              hasMorePages = result.hasMore
              
              // Move to the next page if there are more
              if (hasMorePages) {
                currentPage++
              }
            }
            
            console.log(`Completed sync of ${totalContactsFetched} total contacts from ${account.type} account (${account.oauthData.email})`)
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
