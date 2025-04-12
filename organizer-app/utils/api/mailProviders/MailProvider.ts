import type { Email } from '~/stores/mail'

/**
 * Email pagination parameters
 */
export interface EmailPagination {
  /** Page number (zero-based) */
  page: number;
  /** Items per page */
  pageSize: number;
}

/**
 * Email query parameters
 */
export interface EmailQuery {
  /** Text to search for */
  query?: string;
  /** Which folder to search in */
  folder?: string;
  /** Start date for search */
  fromDate?: Date;
  /** End date for search */
  toDate?: Date;
  /** Whether to include only unread emails */
  unreadOnly?: boolean;
  /** Email address to filter by */
  from?: string;
  /** Email address to filter by */
  to?: string;
}

/**
 * Email fetch results including pagination information
 */
export interface EmailFetchResult {
  /** The fetched emails */
  emails: Email[];
  /** Total count of emails matching the query (for pagination) */
  totalCount: number;
  /** Page number (zero-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether there are more pages available */
  hasMore: boolean;
}

/**
 * Interface for mail provider implementations
 */
export interface MailProvider {
  /**
   * Check if provider is authenticated
   * @returns True if authenticated
   */
  isAuthenticated(): boolean
  
  /**
   * Authenticate with the mail provider
   * @returns True if authentication successful
   */
  authenticate(): Promise<boolean>
  
  /**
   * Fetch emails with pagination and search support
   * @param query Query parameters for filtering emails
   * @param pagination Pagination parameters
   * @returns Email fetch result with pagination information
   */
  fetchEmails(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult>
  
  /**
   * Send an email
   * @param email Email to send
   * @returns True if send was successful
   */
  sendEmail(email: Email): Promise<boolean>
  
  /**
   * Count emails in a folder or matching a query
   * @param query Query parameters for filtering emails
   * @returns Total count of matching emails
   */
  countEmails(query?: EmailQuery): Promise<number>
  
  /**
   * Get folder counts without fetching email content
   * @returns Object with folder names as keys and counts as values
   */
  getFolderCounts(): Promise<Record<string, number>>
}
