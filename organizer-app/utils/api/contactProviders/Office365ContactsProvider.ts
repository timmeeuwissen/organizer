import type { ContactFetchResult, ContactPagination, ContactProvider, ContactQuery } from './ContactProvider'
import type { Person } from '~/types/models'
import type { IntegrationAccount } from '~/types/models'
import { refreshOAuthToken } from '~/utils/api/emailUtils'

/**
 * Office 365 Contacts provider implementation using Microsoft Graph API
 */
export class Office365ContactsProvider implements ContactProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }

  isAuthenticated(): boolean {
    // Check access token
    if (!this.account.oauthData.accessToken) {
      console.log(`[O365Contacts] ${this.account.oauthData.email}: No access token found`)
      return false
    }
    
    // Check token expiry
    // If tokenExpiry is not set, consider the token expired and force a refresh
    if (!this.account.oauthData.tokenExpiry) {
      console.log(`[O365Contacts] ${this.account.oauthData.email}: No token expiry date set, assuming expired`)
      return false
    }
    
    // Check if token is expired
    if (new Date(this.account.oauthData.tokenExpiry) < new Date()) {
      console.log(`[O365Contacts] ${this.account.oauthData.email}: Token expired`)
      return false
    }
    
    // Verify proper MS Graph scopes if scope is specified
    if (this.account.oauthData.scope) {
      const hasContactsScope = 
        this.account.oauthData.scope.includes('contacts') || 
        this.account.oauthData.scope.includes('contacts.read') || 
        this.account.oauthData.scope.includes('https://graph.microsoft.com/contacts.read') ||
        this.account.oauthData.scope.includes('https://graph.microsoft.com/contacts');
        
      if (!hasContactsScope) {
        console.warn(`[O365Contacts] ${this.account.oauthData.email}: Office 365 account missing required contacts scopes:`, this.account.oauthData.scope)
        return false
      }
    }
    
    console.log(`[O365Contacts] ${this.account.oauthData.email}: Authentication valid`)
    return true
  }

  async authenticate(): Promise<boolean> {
    console.log(`[O365Contacts] Office365ContactsProvider.authenticate for ${this.account.oauthData.email}`)
    
    if (this.isAuthenticated()) {
      console.log(`[O365Contacts] ${this.account.oauthData.email} is already authenticated`)
      return true
    }
    
    // Standard OAuth refresh flow for any account with a refresh token
    if (this.account.oauthData.refreshToken) {
      try {
        // Refresh token and get updated account
        const updatedAccount = await refreshOAuthToken(this.account)
        
        // Update this instance's account reference
        this.account = updatedAccount
        
        // Update the account in the pinia store so other components can benefit
        // from the refreshed token without having to refresh again
        import('~/utils/api/emailUtils').then(module => {
          module.updateAccountInStore(updatedAccount)
        }).catch(err => {
          console.error('[O365Contacts] Error importing updateAccountInStore:', err)
        })
        
        console.log(`[O365Contacts] Successfully refreshed token for ${this.account.oauthData.email}`)
        return true
      } catch (error) {
        console.error(`[O365Contacts] Failed to refresh token for ${this.account.oauthData.email}:`, error)
        return false
      }
    }
    
    console.warn(`[O365Contacts] ${this.account.oauthData.email} has no refresh token, would need to redirect to OAuth flow`)
    return false
  }

  async fetchContacts(query?: ContactQuery, pagination?: ContactPagination): Promise<ContactFetchResult> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[O365Contacts] Not authenticated with Office 365')
        return {
          contacts: [],
          totalCount: 0,
          page: 0,
          pageSize: 20,
          hasMore: false
        }
      }
    }

    try {
      // Default values
      const pageSize = pagination?.pageSize || 50
      const skipCount = pagination?.page ? pagination.page * pageSize : 0
      
      // API endpoint for Office 365 contacts (Microsoft Graph API)
      const endpoint = 'https://graph.microsoft.com/v1.0/me/contacts'
      
      // Prepare query parameters
      const params = new URLSearchParams({
        '$top': pageSize.toString(),
        '$skip': skipCount.toString(),
        // Select specific fields to optimize response size
        '$select': 'id,givenName,surname,emailAddresses,mobilePhone,businessPhones,companyName,jobTitle,notes,categories,createdDateTime,lastModifiedDateTime'
      })
      
      // Build filter query if needed
      if (query?.query) {
        // Search in first name, last name, or email
        params.append('$filter', `contains(givenName,'${query.query}') or contains(surname,'${query.query}') or contains(emailAddresses/any(e:e/address),'${query.query}')`)
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      const url = `${endpoint}?${params.toString()}`
      console.log(`[O365Contacts] Fetching contacts from: ${url}`)
      
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[O365Contacts] Fetch error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract contacts
      const office365Contacts = data.value || []
      
      // Convert Office 365 contacts to app Person format
      let contacts = office365Contacts.map((contact: any) => this.office365ContactToPerson(contact))
      
      // Apply additional filters that can't be applied in the API request
      if (query?.organization) {
        contacts = contacts.filter((contact: Person) => 
          contact.organization?.toLowerCase().includes(query.organization!.toLowerCase())
        )
      }

      if (query?.tags && query.tags.length > 0) {
        contacts = contacts.filter((contact: Person) => {
          if (!contact.tags) return false
          return query.tags?.some(tag => contact.tags?.includes(tag))
        })
      }

      // Check if there are more results
      const hasMore = data['@odata.nextLink'] !== undefined

      return {
        contacts,
        totalCount: data['@odata.count'] || contacts.length,
        page: pagination?.page || 0,
        pageSize,
        hasMore
      }
    } catch (error) {
      console.error('[O365Contacts] Error fetching contacts:', error)
      throw new Error('Failed to fetch contacts from Office 365')
    }
  }

  async createContact(contact: Partial<Person>): Promise<{ success: boolean, contactId?: string }> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[O365Contacts] Not authenticated with Office 365')
        return { success: false }
      }
    }

    try {
      // API endpoint for Office 365 contacts (Microsoft Graph API)
      const endpoint = 'https://graph.microsoft.com/v1.0/me/contacts'
      
      // Prepare the contact data in Office 365 format
      const office365Contact = {
        givenName: contact.firstName,
        surname: contact.lastName,
        emailAddresses: contact.email ? [
          {
            address: contact.email,
            name: `${contact.firstName} ${contact.lastName}`
          }
        ] : [],
        mobilePhone: contact.phone,
        companyName: contact.organization,
        jobTitle: contact.role,
        notes: contact.notes
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      console.log('[O365Contacts] Creating contact:', office365Contact)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(office365Contact)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[O365Contacts] Create error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      return {
        success: true,
        contactId: data.id
      }
    } catch (error) {
      console.error('[O365Contacts] Error creating contact:', error)
      return { success: false }
    }
  }

  async updateContact(contactId: string, updates: Partial<Person>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[O365Contacts] Not authenticated with Office 365')
        return false
      }
    }

    try {
      // API endpoint for Office 365 contacts (Microsoft Graph API)
      const endpoint = `https://graph.microsoft.com/v1.0/me/contacts/${contactId}`
      
      // Build update object
      const updateData: Record<string, any> = {}

      if (updates.firstName !== undefined) {
        updateData.givenName = updates.firstName
      }

      if (updates.lastName !== undefined) {
        updateData.surname = updates.lastName
      }

      if (updates.email !== undefined) {
        updateData.emailAddresses = [
          {
            address: updates.email,
            name: `${updates.firstName || ''} ${updates.lastName || ''}`.trim()
          }
        ]
      }

      if (updates.phone !== undefined) {
        updateData.mobilePhone = updates.phone
      }

      if (updates.organization !== undefined) {
        updateData.companyName = updates.organization
      }

      if (updates.role !== undefined) {
        updateData.jobTitle = updates.role
      }

      if (updates.notes !== undefined) {
        updateData.notes = updates.notes
      }

      if (Object.keys(updateData).length === 0) {
        // Nothing to update
        return true
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      console.log(`[O365Contacts] Updating contact ${contactId}:`, updateData)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(updateData)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[O365Contacts] Update error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[O365Contacts] Error updating contact:', error)
      return false
    }
  }

  async deleteContact(contactId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[O365Contacts] Not authenticated with Office 365')
        return false
      }
    }

    try {
      // API endpoint for Office 365 contacts (Microsoft Graph API)
      const endpoint = `https://graph.microsoft.com/v1.0/me/contacts/${contactId}`
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      console.log(`[O365Contacts] Deleting contact: ${contactId}`)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[O365Contacts] Delete error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[O365Contacts] Error deleting contact:', error)
      return false
    }
  }

  async getContactGroups(): Promise<{ id: string; name: string }[]> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[O365Contacts] Not authenticated with Office 365')
        return []
      }
    }

    try {
      // API endpoint for Office 365 contact folders (Microsoft Graph API)
      const endpoint = 'https://graph.microsoft.com/v1.0/me/contactFolders'
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      console.log('[O365Contacts] Fetching contact folders')
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[O365Contacts] Get contact folders error:', errorText)
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract contact folders
      const folders = data.value || []
      return folders.map((folder: any) => ({
        id: folder.id,
        name: folder.displayName
      }))
    } catch (error) {
      console.error('[O365Contacts] Error fetching contact folders:', error)
      return []
    }
  }

  // Helper method to convert Office 365 contact format to our app's Person format
  private office365ContactToPerson(office365Contact: any): Person {
    return {
      id: office365Contact.id,
      userId: '', // Will be set by the store
      firstName: office365Contact.givenName || '',
      lastName: office365Contact.surname || '',
      email: office365Contact.emailAddresses?.[0]?.address,
      phone: office365Contact.mobilePhone || office365Contact.businessPhones?.[0],
      organization: office365Contact.companyName,
      role: office365Contact.jobTitle,
      notes: office365Contact.notes,
      // Tags - using categories if available
      tags: office365Contact.categories || [],
      createdAt: new Date(office365Contact.createdDateTime) || new Date(),
      updatedAt: new Date(office365Contact.lastModifiedDateTime) || new Date()
    } as Person
  }
}
