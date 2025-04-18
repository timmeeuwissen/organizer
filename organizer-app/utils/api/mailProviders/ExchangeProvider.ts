import type { Email } from '~/stores/mail'
import { BaseMailProvider } from './BaseMailProvider'
import type { EmailQuery, EmailPagination, EmailFetchResult } from './MailProvider'
import { Office365Provider } from './Office365Provider'

/**
 * Microsoft Exchange provider implementation
 * 
 * Note: This is primarily a wrapper around Office365Provider since
 * modern Exchange instances use the same Microsoft Graph API
 */
export class ExchangeProvider extends BaseMailProvider {
  private office365Provider: Office365Provider
  
  constructor(account: any) {
    super(account)
    this.office365Provider = new Office365Provider(account)
  }
  
  /**
   * Fetch emails with pagination and search support
   */
  async fetchEmails(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult> {
    // Just delegate to Office365Provider for now
    return this.office365Provider.fetchEmails(query, pagination)
  }
  
  /**
   * Count emails in a folder or matching a query
   */
  async countEmails(query?: EmailQuery): Promise<number> {
    return this.office365Provider.countEmails(query)
  }
  
  /**
   * Get folder counts without fetching email content
   */
  async getFolderCounts(): Promise<Record<string, number>> {
    return this.office365Provider.getFolderCounts()
  }
  
  /**
   * Send an email
   */
  async sendEmail(email: Email): Promise<boolean> {
    return this.office365Provider.sendEmail(email)
  }
}
