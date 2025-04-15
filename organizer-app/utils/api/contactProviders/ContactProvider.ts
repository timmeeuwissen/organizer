import type { Person } from '~/types/models'

/**
 * Contact pagination parameters
 */
export interface ContactPagination {
  /** Page number (zero-based) */
  page: number;
  /** Items per page */
  pageSize: number;
}

/**
 * Contact query parameters
 */
export interface ContactQuery {
  /** Text to search for */
  query?: string;
  /** Group or folder to search in */
  group?: string;
  /** Organization to filter by */
  organization?: string;
  /** Tags to filter by */
  tags?: string[];
}

/**
 * Contact fetch results including pagination information
 */
export interface ContactFetchResult {
  /** The fetched contacts */
  contacts: Person[];
  /** Total count of contacts matching the query (for pagination) */
  totalCount: number;
  /** Page number (zero-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether there are more pages available */
  hasMore: boolean;
}

/**
 * Interface for contact provider implementations
 */
export interface ContactProvider {
  /**
   * Check if provider is authenticated
   * @returns True if authenticated
   */
  isAuthenticated(): boolean
  
  /**
   * Authenticate with the contact provider
   * @returns True if authentication successful
   */
  authenticate(): Promise<boolean>
  
  /**
   * Fetch contacts with pagination and search support
   * @param query Query parameters for filtering contacts
   * @param pagination Pagination parameters
   * @returns Contact fetch result with pagination information
   */
  fetchContacts(query?: ContactQuery, pagination?: ContactPagination): Promise<ContactFetchResult>
  
  /**
   * Create a contact
   * @param contact Contact to create
   * @returns True if creation successful and the created contact ID
   */
  createContact(contact: Partial<Person>): Promise<{success: boolean, contactId?: string}>
  
  /**
   * Update a contact
   * @param contact Contact to update
   * @returns True if update was successful
   */
  updateContact(contactId: string, updates: Partial<Person>): Promise<boolean>
  
  /**
   * Delete a contact
   * @param contactId ID of contact to delete
   * @returns True if deletion was successful
   */
  deleteContact(contactId: string): Promise<boolean>
  
  /**
   * Get available contact groups or folders
   * @returns List of contact groups
   */
  getContactGroups(): Promise<{id: string, name: string}[]>
}
