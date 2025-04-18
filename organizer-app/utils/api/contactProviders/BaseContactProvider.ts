import { BaseProvider } from '~/utils/api/core/BaseProvider'
import type { Person } from '~/types/models'
import type { ContactProvider } from './ContactProvider'
import type { ContactQuery, ContactFetchResult, ContactPagination } from './ContactProvider'

/**
 * Base class for contact providers with shared functionality
 */
export abstract class BaseContactProvider extends BaseProvider implements ContactProvider {
  /**
   * Fetch contacts with pagination and search support
   * @param query Query parameters for filtering contacts
   * @param pagination Pagination parameters
   * @returns Contact fetch result with pagination information
   */
  abstract fetchContacts(query?: ContactQuery, pagination?: ContactPagination): Promise<ContactFetchResult>
  
  /**
   * Create a new contact in the provider
   * @param contact Contact to create
   * @returns True if creation successful and the created contact ID
   */
  abstract createContact(contact: Partial<Person>): Promise<{success: boolean, contactId?: string}>
  
  /**
   * Update an existing contact
   * @param contactId ID of the contact to update
   * @param updates Partial contact data to update
   * @returns True if update was successful
   */
  abstract updateContact(contactId: string, updates: Partial<Person>): Promise<boolean>
  
  /**
   * Delete a contact
   * @param contactId ID of the contact to delete
   * @returns True if deletion was successful
   */
  abstract deleteContact(contactId: string): Promise<boolean>
  
  /**
   * Get available contact groups or folders
   * @returns List of contact groups
   */
  abstract getContactGroups(): Promise<{id: string, name: string}[]>
  
  /**
   * Count contacts matching a query
   * @param query Query parameters for filtering contacts
   * @returns Total count of matching contacts
   */
  async countContacts(query?: ContactQuery): Promise<number> {
    // Default implementation uses fetchContacts with page size 1
    // Override in provider-specific implementations for better performance
    const result = await this.fetchContacts(query, { page: 0, pageSize: 1 })
    return result.totalCount
  }
  
  /**
   * Sync contacts with the provider
   * @returns Number of contacts synced
   */
  async syncContacts(): Promise<number> {
    // Default implementation - override in provider-specific implementations
    console.log(`[ContactProvider] Syncing contacts for ${this.account.oauthData.email}`)
    return 0
  }
}
