import type { Email } from '~/stores/mail'
import { BaseProvider } from '~/utils/api/core/BaseProvider'
import type { EmailFetchResult, EmailPagination, EmailQuery, MailProvider } from './MailProvider'

/**
 * Base class for mail providers with common functionality
 */
export abstract class BaseMailProvider extends BaseProvider implements MailProvider {
  /**
   * Fetch emails with pagination and search support
   * @param query Query parameters for filtering emails
   * @param pagination Pagination parameters
   * @returns Email fetch result with pagination information
   */
  abstract fetchEmails(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult>
  
  /**
   * Send an email
   * @param email Email to send
   * @returns True if send was successful
   */
  abstract sendEmail(email: Email): Promise<boolean>
  
  /**
   * Count emails in a folder or matching a query
   * @param query Query parameters for filtering emails
   * @returns Total count of matching emails
   */
  abstract countEmails(query?: EmailQuery): Promise<number>
  
  /**
   * Get folder counts without fetching email content
   * @returns Object with folder names as keys and counts as values
   */
  abstract getFolderCounts(): Promise<Record<string, number>>
}
