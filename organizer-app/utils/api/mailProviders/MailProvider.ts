import type { Email } from '~/stores/mail'

/**
 * Base interface for mail provider implementations
 */
export interface MailProvider {
  /**
   * Fetch emails from the provider
   * @param folder The folder to fetch emails from
   * @param maxResults Maximum number of emails to fetch
   * @returns Array of email objects
   */
  fetchEmails(folder: string, maxResults?: number): Promise<Email[]>
  
  /**
   * Send an email through the provider
   * @param email Email to send
   * @returns Confirmation or error
   */
  sendEmail(email: Email): Promise<boolean>
  
  /**
   * Check if the provider authentication is valid
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated(): boolean
  
  /**
   * Authenticate with the provider
   * @returns True if authentication was successful
   */
  authenticate(): Promise<boolean>
}
