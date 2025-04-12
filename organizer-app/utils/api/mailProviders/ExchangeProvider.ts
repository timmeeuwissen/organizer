import type { IntegrationAccount } from '~/types/models'
import type { Email, EmailPerson } from '~/stores/mail'
import { refreshOAuthToken } from '~/utils/api/emailUtils'
import type { MailProvider } from './MailProvider'

/**
 * Exchange provider implementation
 */
export class ExchangeProvider implements MailProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }
  
  isAuthenticated(): boolean {
    return !!this.account.accessToken && 
      (!this.account.tokenExpiry || new Date(this.account.tokenExpiry) > new Date())
  }
  
  async authenticate(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true
    }
    
    if (this.account.refreshToken) {
      try {
        this.account = await refreshOAuthToken(this.account)
        return true
      } catch (error) {
        console.error('Failed to refresh Exchange token:', error)
        return false
      }
    }
    
    // Would need to redirect user to OAuth flow
    return false
  }
  
  async fetchEmails(folder: string = 'inbox', maxResults: number = 50): Promise<Email[]> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Exchange')
        return []
      }
    }
    
    try {
      // Using Exchange Web Services API
      console.log(`[Exchange] Fetching ${maxResults} emails from ${folder} folder for ${this.account.email}`)
      
      // Check if we have proper configuration
      if (!this.account.server) {
        throw new Error('Exchange server URL is required')
      }
      
      // Log server info
      console.log(`[Exchange] Server: ${this.account.server}`);
      
      // Prepare API endpoint
      const endpoint = `${this.account.server}/api/v2.0/me/mailFolders/${folder}/messages`
      console.log(`[Exchange] Endpoint: ${endpoint}`);
      
      // Prepare headers with authentication - ensure proper token format for Exchange API
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'exchange.timezone="UTC"'
      }
      
      // Log authorization header snippet
      const tokenPreview = this.account.accessToken 
        ? `Bearer ${this.account.accessToken.substring(0, 10)}...`
        : 'Missing access token';
      console.log(`[Exchange] Using auth token: ${tokenPreview}`);
      
      // Build query parameters
      const params = new URLSearchParams({
        '$top': maxResults.toString(),
        '$orderby': 'receivedDateTime DESC',
        '$select': 'id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,body'
      })
      
      // Make the request
      console.log(`[Exchange] Requesting: ${endpoint}?${params.toString()}`);
      try {
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          method: 'GET',
          headers: headers
        })
        
        console.log('[Exchange] Response status:', response.status);
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Exchange] HTTP error:', errorText);
          throw new Error(`Exchange API error: ${response.status} ${response.statusText}`);
        }
        
        // Parse the response
        const data = await response.json();
        console.log(`[Exchange] Retrieved ${data.value?.length || 0} messages`);
        
        // Convert Exchange messages to our Email interface
        const emails: Email[] = (data.value || []).map((message: any) => {
          return {
            id: message.id,
            subject: message.subject || '(No subject)',
            from: {
              name: message.from?.emailAddress?.name || 'Unknown',
              email: message.from?.emailAddress?.address || 'unknown@example.com'
            },
            to: message.toRecipients?.map((recipient: any) => ({
              name: recipient.emailAddress?.name || 'Unknown',
              email: recipient.emailAddress?.address || 'unknown@example.com'
            })) || [],
            body: message.body?.content || message.bodyPreview || '',
            date: new Date(message.receivedDateTime),
            read: message.isRead,
            folder,
            accountId: this.account.id
          };
        });
        
        console.log(`[Exchange] Successfully processed ${emails.length} emails`);
        return emails;
      } catch (fetchError) {
        console.error('[Exchange] Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching Exchange emails:', error)
      return []
    }
  }
  
  async sendEmail(email: Email): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Exchange')
        return false
      }
    }
    
    try {
      // Using Exchange Web Services API
      console.log(`[Exchange] Sending email "${email.subject}" to ${email.to.map(t => t.email).join(', ')}`)
      
      // Check if we have proper configuration
      if (!this.account.server) {
        throw new Error('Exchange server URL is required')
      }
      
      // Prepare API endpoint
      const endpoint = `${this.account.server}/api/v2.0/me/sendMail`
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Convert email to Exchange format
      const toRecipients = email.to.map(recipient => ({
        emailAddress: {
          address: recipient.email,
          name: recipient.name
        }
      }))
      
      const ccRecipients = email.cc?.map(recipient => ({
        emailAddress: {
          address: recipient.email,
          name: recipient.name
        }
      })) || []
      
      // Prepare message payload
      const payload = {
        message: {
          subject: email.subject,
          body: {
            contentType: 'HTML',
            content: email.body
          },
          toRecipients: toRecipients,
          ccRecipients: ccRecipients
        },
        saveToSentItems: true
      }
      
      // Send the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      })
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Exchange] Send mail error:', errorText);
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`);
      }
      
      console.log('[Exchange] Email sent successfully');
      return true
    } catch (error) {
      console.error('Error sending Exchange email:', error)
      return false
    }
  }
}
