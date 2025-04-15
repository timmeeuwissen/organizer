import type { ContactFetchResult, ContactPagination, ContactProvider, ContactQuery } from './ContactProvider'
import type { Person } from '~/types/models'
import type { IntegrationAccount } from '~/types/models'
import { refreshOAuthToken } from '~/utils/api/emailUtils'

/**
 * Google Contacts provider implementation using People API
 */
export class GoogleContactsProvider implements ContactProvider {
  private account: IntegrationAccount
  private pageTokens: Record<number, string> = {}
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }

  isAuthenticated(): boolean {
    // Check access token
    if (!this.account.oauthData.accessToken) {
      console.log(`[GContacts] ${this.account.oauthData.email}: No access token found`)
      return false
    }
    
    // Check token expiry
    // If tokenExpiry is not set, consider the token expired and force a refresh
    if (!this.account.oauthData.tokenExpiry) {
      console.log(`[GContacts] ${this.account.oauthData.email}: No token expiry date set, assuming expired`)
      return false
    }
    
    // Check if token is expired
    if (new Date(this.account.oauthData.tokenExpiry) < new Date()) {
      console.log(`[GContacts] ${this.account.oauthData.email}: Token expired`)
      return false
    }
    
    // Verify proper People API scopes if scope is specified
    if (this.account.oauthData.scope) {
      const hasContactsScope = 
        this.account.oauthData.scope.includes('contacts') || 
        this.account.oauthData.scope.includes('contacts.readonly') || 
        this.account.oauthData.scope.includes('https://www.googleapis.com/auth/contacts') ||
        this.account.oauthData.scope.includes('https://www.googleapis.com/auth/contacts.readonly');
        
      if (!hasContactsScope) {
        console.warn(`[GContacts] ${this.account.oauthData.email}: Google account missing required contacts scopes:`, this.account.oauthData.scope)
        return false
      }
    }
    
    console.log(`[GContacts] ${this.account.oauthData.email}: Authentication valid`)
    return true
  }

  async authenticate(): Promise<boolean> {
    console.log(`[GContacts] GoogleContactsProvider.authenticate for ${this.account.oauthData.email}`)
    
    if (this.isAuthenticated()) {
      console.log(`[GContacts] ${this.account.oauthData.email} is already authenticated`)
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
          console.error('[GContacts] Error importing updateAccountInStore:', err)
        })
        
        console.log(`[GContacts] Successfully refreshed token for ${this.account.oauthData.email}`)
        return true
      } catch (error) {
        console.error(`[GContacts] Failed to refresh token for ${this.account.oauthData.email}:`, error)
        return false
      }
    }
    
    console.warn(`[GContacts] ${this.account.oauthData.email} has no refresh token, would need to redirect to OAuth flow`)
    return false
  }

  async fetchContacts(query?: ContactQuery, pagination?: ContactPagination): Promise<ContactFetchResult> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GContacts] Not authenticated with Google Contacts')
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
      const page = pagination?.page || 0
      
      // API endpoint for Google People API
      const endpoint = 'https://people.googleapis.com/v1/people/me/connections'
      
      // Prepare query parameters
      const params = new URLSearchParams({
        personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,memberships',
        pageSize: pageSize.toString()
      })
      
      // Add query parameter if provided
      if (query?.query) {
        params.append('query', query.query)
      }
      
      // For Google Contacts, we need to handle pagination with page tokens
      if (page > 0 && this.pageTokens && this.pageTokens[page - 1]) {
        params.append('pageToken', this.pageTokens[page - 1])
      } else if (page > 0) {
        // If we don't have a token for the requested page but page > 0,
        // we need to start from page 0 and work our way up
        console.log(`[GContacts] No token for page ${page}, starting from page 0`)
        return this.fetchContactsFromStart(query, pagination)
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      const url = `${endpoint}?${params.toString()}`
      console.log(`[GContacts] Fetching contacts from: ${url}`)
      
      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })

      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GContacts] Fetch error:', errorText)
        throw new Error(`Google People API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()

      // Extract connections
      const connections = data.connections || []
      
      // Store the next page token for future use
      const nextPageToken = data.nextPageToken
      if (nextPageToken) {
        if (!this.pageTokens) this.pageTokens = {}
        this.pageTokens[page] = nextPageToken
      }
      
      // Convert Google contacts to app Person format
      let contacts = connections.map((connection: any) => this.googleContactToPerson(connection))
      
      // Apply additional filters that can't be applied in the API request
      if (query?.organization) {
        contacts = contacts.filter(contact => 
          contact.organization?.toLowerCase().includes(query.organization!.toLowerCase())
        )
      }

      if (query?.tags && query.tags.length > 0) {
        contacts = contacts.filter(contact => {
          if (!contact.tags) return false
          return query.tags?.some(tag => contact.tags?.includes(tag))
        })
      }

      const totalCount = data.totalItems || data.totalPeople || connections.length
      const hasMore = !!nextPageToken

      return {
        contacts,
        totalCount,
        page,
        pageSize,
        hasMore
      }
    } catch (error) {
      console.error('[GContacts] Error fetching contacts:', error)
      throw new Error('Failed to fetch contacts from Google')
    }
  }

  /**
   * Fetch contacts from page 0 and sequentially get tokens
   * until we reach the desired page
   */
  private async fetchContactsFromStart(query?: ContactQuery, pagination?: ContactPagination): Promise<ContactFetchResult> {
    const targetPage = pagination?.page || 0
    
    // If target is page 0, just do a normal fetch
    if (targetPage === 0) {
      return this.fetchContacts(query, { page: 0, pageSize: pagination?.pageSize || 50 })
    }
    
    // Start from page 0
    let currentPage = 0
    let result: ContactFetchResult
    
    // Reset page tokens
    this.pageTokens = {}
    
    // Keep fetching pages until we reach the target page
    do {
      // Fetch current page
      result = await this.fetchContacts(query, { 
        page: currentPage, 
        pageSize: pagination?.pageSize || 50 
      })
      
      // Move to next page if there is one
      if (result.hasMore) {
        currentPage++
      } else {
        // No more pages available, return last page
        return result
      }
      
    } while (currentPage < targetPage)
    
    // Now fetch the target page with the correct token
    return this.fetchContacts(query, pagination)
  }

  async createContact(contact: Partial<Person>): Promise<{ success: boolean, contactId?: string }> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GContacts] Not authenticated with Google Contacts')
        return { success: false }
      }
    }

    try {
      // API endpoint for Google People API
      const endpoint = 'https://people.googleapis.com/v1/people:createContact'
      
      // Prepare the contact data in Google People API format
      const googleContact = {
        names: [{
          givenName: contact.firstName,
          familyName: contact.lastName
        }],
        emailAddresses: contact.email ? [{ value: contact.email }] : [],
        phoneNumbers: contact.phone ? [{ value: contact.phone }] : [],
        organizations: contact.organization ? [{ 
          name: contact.organization, 
          title: contact.role 
        }] : [],
        biographies: contact.notes ? [{ value: contact.notes }] : []
      }
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      console.log('[GContacts] Creating contact:', googleContact)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(googleContact)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GContacts] Create error:', errorText)
        throw new Error(`Google People API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract the resourceName and get the ID
      const resourceName = data.resourceName
      const contactId = resourceName ? resourceName.split('/').pop() : undefined
      
      return {
        success: !!contactId,
        contactId
      }
    } catch (error) {
      console.error('[GContacts] Error creating contact:', error)
      return { success: false }
    }
  }

  async updateContact(contactId: string, updates: Partial<Person>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GContacts] Not authenticated with Google Contacts')
        return false
      }
    }

    try {
      // First, get the existing contact to have the full resourceName
      const getEndpoint = `https://people.googleapis.com/v1/people/${contactId}`;
      const getParams = new URLSearchParams({
        personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies'
      });
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Get the existing contact
      const getResponse = await fetch(`${getEndpoint}?${getParams.toString()}`, {
        method: 'GET',
        headers: headers
      });
      
      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('[GContacts] Get contact error:', errorText);
        throw new Error(`Google People API error: ${getResponse.status} ${getResponse.statusText}`);
      }
      
      const existingContact = await getResponse.json();
      const resourceName = existingContact.resourceName;
      
      if (!resourceName) {
        console.error('[GContacts] Resource name not found for contact:', contactId);
        return false;
      }
      
      // API endpoint for update
      const updateEndpoint = `https://people.googleapis.com/v1/${resourceName}:updateContact`;
      
      // Build update fields and updatePersonFields parameter
      const updateContact: any = {};
      const updatePersonFields: string[] = [];
      
      // Names
      if (updates.firstName !== undefined || updates.lastName !== undefined) {
        updateContact.names = [{
          givenName: updates.firstName || existingContact.names?.[0]?.givenName,
          familyName: updates.lastName || existingContact.names?.[0]?.familyName
        }];
        updatePersonFields.push('names');
      }
      
      // Email
      if (updates.email !== undefined) {
        updateContact.emailAddresses = updates.email ? [{ value: updates.email }] : [];
        updatePersonFields.push('emailAddresses');
      }
      
      // Phone
      if (updates.phone !== undefined) {
        updateContact.phoneNumbers = updates.phone ? [{ value: updates.phone }] : [];
        updatePersonFields.push('phoneNumbers');
      }
      
      // Organization/Role
      if (updates.organization !== undefined || updates.role !== undefined) {
        updateContact.organizations = [{
          name: updates.organization || existingContact.organizations?.[0]?.name,
          title: updates.role || existingContact.organizations?.[0]?.title
        }];
        updatePersonFields.push('organizations');
      }
      
      // Notes
      if (updates.notes !== undefined) {
        updateContact.biographies = [{ value: updates.notes }];
        updatePersonFields.push('biographies');
      }
      
      if (updatePersonFields.length === 0) {
        // Nothing to update
        return true;
      }
      
      // Prepare update parameters
      const updateParams = new URLSearchParams({
        updatePersonFields: updatePersonFields.join(',')
      });
      
      console.log(`[GContacts] Updating contact ${contactId} with fields:`, updatePersonFields);
      
      // Make the update request
      const updateResponse = await fetch(`${updateEndpoint}?${updateParams.toString()}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(updateContact)
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[GContacts] Update error:', errorText);
        throw new Error(`Google People API error: ${updateResponse.status} ${updateResponse.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('[GContacts] Error updating contact:', error);
      return false;
    }
  }

  async deleteContact(contactId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GContacts] Not authenticated with Google Contacts')
        return false
      }
    }

    try {
      // API endpoint for Google People API
      const endpoint = `https://people.googleapis.com/v1/people/${contactId}:deleteContact`
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      console.log(`[GContacts] Deleting contact: ${contactId}`)
      
      // Make the request
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GContacts] Delete error:', errorText)
        throw new Error(`Google People API error: ${response.status} ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('[GContacts] Error deleting contact:', error)
      return false
    }
  }

  async getContactGroups(): Promise<{ id: string; name: string }[]> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('[GContacts] Not authenticated with Google Contacts')
        return []
      }
    }

    try {
      // API endpoint for Google People API
      const endpoint = 'https://people.googleapis.com/v1/contactGroups'
      
      // Prepare query parameters
      const params = new URLSearchParams({
        pageSize: '100'
      })
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.oauthData.accessToken}`,
        'Accept': 'application/json'
      }
      
      console.log('[GContacts] Fetching contact groups')
      
      // Make the request
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers: headers
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GContacts] Get contact groups error:', errorText)
        throw new Error(`Google People API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse the response
      const data = await response.json()
      
      // Extract contact groups
      const groups = data.contactGroups || []
      return groups.map((group: any) => ({
        id: group.resourceName?.split('/').pop() || '',
        name: group.name || 'Unnamed Group'
      }))
    } catch (error) {
      console.error('[GContacts] Error fetching contact groups:', error)
      return []
    }
  }

  // Helper method to convert Google contact format to our app's Person format
  private googleContactToPerson(googleContact: any): Person {
    const resourceName = googleContact.resourceName || ''
    const id = resourceName.split('/').pop() || ''
    const firstName = googleContact.names?.[0]?.givenName || ''
    const lastName = googleContact.names?.[0]?.familyName || ''
    const email = googleContact.emailAddresses?.[0]?.value
    const phone = googleContact.phoneNumbers?.[0]?.value
    const organization = googleContact.organizations?.[0]?.name
    const role = googleContact.organizations?.[0]?.title
    const notes = googleContact.biographies?.[0]?.value
    
    // Extract any tags/labels from Google's contact
    const tags = googleContact.memberships?.map((membership: any) => 
      membership.contactGroupMembership?.contactGroupId || ''
    ).filter(Boolean) || []

    return {
      id,
      userId: '', // Will be set by the store
      firstName,
      lastName,
      email,
      phone,
      organization,
      role,
      notes,
      tags,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Person
  }
}
