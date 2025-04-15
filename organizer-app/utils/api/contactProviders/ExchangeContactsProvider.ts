import type { ContactFetchResult, ContactPagination, ContactProvider, ContactQuery } from './ContactProvider'
import type { Person } from '~/types/models'
import type { IntegrationAccount } from '~/types/models'
import { refreshOAuthToken } from '~/utils/api/emailUtils'

/**
 * Exchange Contacts provider implementation using Outlook REST API
 */
export class ExchangeContactsProvider implements ContactProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }

  isAuthenticated(): boolean {
    // Check access token
    if (!this.account.oauthData.accessToken) {
      console.log(`[ExContacts] ${this.account.oauthData.email}: No access token found`)
      return false
    }
    
    // Check token expiry
    // If tokenExpiry is not set, consider the token expired and force a refresh
    if (!this.account.oauthData.tokenExpiry) {
      console.log(`[ExContacts] ${this.account.oauthData.email}: No token expiry date set, assuming expired`)
      return false
    }
    
    // Check if token is expired
    if (new Date(this.account.oauthData.tokenExpiry) < new Date()) {
      console.log(`[ExContacts] ${this.account.oauthData.email}: Token expired`)
      return false
    }
    
    // Verify proper Exchange/Outlook scopes if scope is specified
    if (this.account.oauthData.scope) {
      const hasContactsScope = 
        this.account.oauthData.scope.includes('contacts') || 
        this.account.oauthData.scope.includes('contacts.read') || 
        this.account.oauthData.scope.includes('https://outlook.office.com/contacts.read') ||
        this.account.oauthData.scope.includes('https://outlook.office.com/contacts');
        
      if (!hasContactsScope) {
        console.warn(`[ExContacts] ${this.account.oauthData.email}: Exchange account missing required contacts scopes:`, this.account.oauthData.scope)
        return false
      }
    }
    
    console.log(`[ExContacts] ${this.account.oauthData.email}: Authentication valid`)
    return true
  }

  async authenticate(): Promise<boolean> {
    console.log(`[ExContacts] ExchangeContactsProvider.authenticate for ${this.account.oauthData.email}`)
    
    if (this.isAuthenticated()) {
      console.log(`[ExContacts] ${this.account.oauthData.email} is already authenticated`)
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
          console.error('[ExContacts] Error importing updateAccountInStore:', err)
        })
        
        console.log(`[ExContacts] Successfully refreshed token for ${this.account.oauthData.email}`)
        return true
      } catch (error) {
        console.error(`[ExContacts] Failed to refresh token for ${this.account.oauthData.email}:`, error)
        return false
      }
    }
    
    console.warn(`[ExContacts] ${this.account.oauthData.email} has no refresh token, would need to redirect to OAuth flow`)
    return false
  }

  async fetchContacts(query?: ContactQuery, pagination?: ContactPagination): Promise<ContactFetchResult> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[ExContacts] Not authenticated with Exchange')
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
      
      // API endpoint for Exchange contacts (using Outlook REST API)
      const endpoint = 'https://outlook.office.com/api/v2.0/me/contacts'
      
      // Prepare query parameters
      const params = new URLSearchParams({
        '$top': pageSize.toString(),
        '$skip': skipCount.toString()
      })
      
      // Build filter query if needed
      if (query?.query) {
        // Search in first name, last name, or email
        params.append('$filter', `contains(GivenName,'${query.query}') or contains(Surname,'${query.query}') or contains(EmailAddresses/any(e:e/Address),'${query.query}')`)
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'outlook.body-content-type="text"'
      }
      
      const url = `${endpoint}?${params.toString()}`
      console.log(`[ExContacts] Fetching contacts from: ${url}`)
      
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ExContacts] Fetch error:', errorText)
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract contacts
      const exchangeContacts = data.value || []
      
      // Convert Exchange contacts to app Person format
      let contacts = exchangeContacts.map((contact: any) => this.exchangeContactToPerson(contact))
      
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
        totalCount: contacts.length, // Exchange API typically doesn't return a count
        page: pagination?.page || 0,
        pageSize,
        hasMore
      }
    } catch (error) {
      console.error('[ExContacts] Error fetching contacts:', error)
      throw new Error('Failed to fetch contacts from Exchange')
    }
  }

  async createContact(contact: Partial<Person>): Promise<{ success: boolean, contactId?: string }> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[ExContacts] Not authenticated with Exchange')
        return { success: false }
      }
    }

    try {
      // API endpoint for Exchange contacts (using Outlook REST API)
      const endpoint = 'https://outlook.office.com/api/v2.0/me/contacts'
      
      // Prepare the contact data in Exchange format
      const exchangeContact = {
        GivenName: contact.firstName,
        Surname: contact.lastName,
        EmailAddresses: contact.email ? [
          {
            Address: contact.email,
            Name: `${contact.firstName} ${contact.lastName}`
          }
        ] : [],
        MobilePhone: contact.phone,
        CompanyName: contact.organization,
        JobTitle: contact.role,
        // Notes are stored in the Body field in Exchange
        Body: {
          ContentType: 'Text',
          Content: contact.notes
        }
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      console.log('[ExContacts] Creating contact:', exchangeContact)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(exchangeContact)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ExContacts] Create error:', errorText)
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      return {
        success: true,
        contactId: data.Id
      }
    } catch (error) {
      console.error('[ExContacts] Error creating contact:', error)
      return { success: false }
    }
  }

  async updateContact(contactId: string, updates: Partial<Person>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[ExContacts] Not authenticated with Exchange')
        return false
      }
    }

    try {
      // API endpoint for Exchange contacts (using Outlook REST API)
      const endpoint = `https://outlook.office.com/api/v2.0/me/contacts/${contactId}`
      
      // Build update object
      const updateData: Record<string, any> = {}

      if (updates.firstName !== undefined) {
        updateData.GivenName = updates.firstName
      }

      if (updates.lastName !== undefined) {
        updateData.Surname = updates.lastName
      }

      if (updates.email !== undefined) {
        updateData.EmailAddresses = [
          {
            Address: updates.email,
            Name: `${updates.firstName || ''} ${updates.lastName || ''}`.trim()
          }
        ]
      }

      if (updates.phone !== undefined) {
        updateData.MobilePhone = updates.phone
      }

      if (updates.organization !== undefined) {
        updateData.CompanyName = updates.organization
      }

      if (updates.role !== undefined) {
        updateData.JobTitle = updates.role
      }

      if (updates.notes !== undefined) {
        updateData.Body = {
          ContentType: 'Text',
          Content: updates.notes
        }
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
      
      console.log(`[ExContacts] Updating contact ${contactId}:`, updateData)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(updateData)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ExContacts] Update error:', errorText)
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[ExContacts] Error updating contact:', error)
      return false
    }
  }

  async deleteContact(contactId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[ExContacts] Not authenticated with Exchange')
        return false
      }
    }

    try {
      // API endpoint for Exchange contacts (using Outlook REST API)
      const endpoint = `https://outlook.office.com/api/v2.0/me/contacts/${contactId}`
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      console.log(`[ExContacts] Deleting contact: ${contactId}`)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ExContacts] Delete error:', errorText)
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[ExContacts] Error deleting contact:', error)
      return false
    }
  }

  async getContactGroups(): Promise<{ id: string; name: string }[]> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[ExContacts] Not authenticated with Exchange')
        return []
      }
    }

    try {
      // API endpoint for Exchange contact folders (using Outlook REST API)
      const endpoint = 'https://outlook.office.com/api/v2.0/me/contactfolders'
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      console.log('[ExContacts] Fetching contact folders')
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ExContacts] Get contact folders error:', errorText)
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract contact folders
      const folders = data.value || []
      return folders.map((folder: any) => ({
        id: folder.Id,
        name: folder.DisplayName
      }))
    } catch (error) {
      console.error('[ExContacts] Error fetching contact folders:', error)
      return []
    }
  }

  // Helper method to convert Exchange contact format to our app's Person format
  private exchangeContactToPerson(exchangeContact: any): Person {
    return {
      id: exchangeContact.Id,
      userId: '', // Will be set by the store
      firstName: exchangeContact.GivenName || '',
      lastName: exchangeContact.Surname || '',
      email: exchangeContact.EmailAddresses?.[0]?.Address,
      phone: exchangeContact.MobilePhone || exchangeContact.BusinessPhones?.[0],
      organization: exchangeContact.CompanyName,
      role: exchangeContact.JobTitle,
      notes: exchangeContact.Body?.Content,
      // Exchange doesn't have a direct equivalent to tags, so we use categories if available
      tags: exchangeContact.Categories || [],
      createdAt: new Date(exchangeContact.CreatedDateTime) || new Date(),
      updatedAt: new Date(exchangeContact.LastModifiedDateTime) || new Date()
    } as Person
  }
}
