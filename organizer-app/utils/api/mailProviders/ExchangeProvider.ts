import type { IntegrationAccount } from '~/types/models'
import type { Email, EmailPerson } from '~/stores/mail'
import { refreshOAuthToken } from '~/utils/api/emailUtils'
import type { MailProvider, EmailQuery, EmailPagination, EmailFetchResult } from './MailProvider'

/**
 * Exchange provider implementation
 */
export class ExchangeProvider implements MailProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }
  
  isAuthenticated(): boolean {
    console.log(`ExchangeProvider.isAuthenticated check for ${this.account.email}:`, {
      hasAccessToken: !!this.account.accessToken,
      tokenExpiry: this.account.tokenExpiry,
      currentTime: new Date(),
      isTokenExpired: this.account.tokenExpiry ? new Date(this.account.tokenExpiry) < new Date() : 'No expiry set',
      scope: this.account.scope
    });
    
    // Check access token
    if (!this.account.accessToken) {
      console.log(`${this.account.email}: No access token found`);
      return false;
    }
    
    // Check token expiry
    // If tokenExpiry is not set, consider the token expired and force a refresh
    if (!this.account.tokenExpiry) {
      console.log(`${this.account.email}: No token expiry date set, assuming expired`);
      return false;
    }
    
    // Check if token is expired
    if (new Date(this.account.tokenExpiry) < new Date()) {
      console.log(`${this.account.email}: Token expired`);
      return false;
    }
    
    console.log(`${this.account.email}: Authentication valid`);
    return true;
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
  
  /**
   * Fetch emails with pagination and search support
   */
  async fetchEmails(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Exchange')
        return {
          emails: [],
          totalCount: 0,
          page: pagination?.page || 0,
          pageSize: pagination?.pageSize || 20,
          hasMore: false
        }
      }
    }
    
    try {
      // Default values
      const folder = query?.folder || 'inbox';
      const pageSize = pagination?.pageSize || 20;
      const page = pagination?.page || 0;
      
      // Using Exchange Web Services API
      console.log(`[Exchange] Fetching emails from ${folder} folder (page ${page}, pageSize ${pageSize}) for ${this.account.email}`)
      
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
        '$top': pageSize.toString(),
        '$skip': (page * pageSize).toString(),
        '$orderby': 'receivedDateTime DESC',
        '$select': 'id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,body',
        '$count': 'true'
      });
      
      // Add filters based on query
      if (query?.query) {
        params.append('$search', `"${query.query}"`);
      }
      
      if (query?.unreadOnly) {
        params.append('$filter', 'isRead eq false');
      }
      
      if (query?.from) {
        params.append('$filter', `from/emailAddress/address eq '${query.from}'`);
      }
      
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
        
        // Get total count for pagination (from @odata.count or count via another call)
        const totalCount = data['@odata.count'] || await this.countEmails(query);
        
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
        
        // Check if there are more pages
        const hasMore = (page + 1) * pageSize < totalCount;
        
        return {
          emails,
          totalCount,
          page,
          pageSize,
          hasMore
        };
      } catch (fetchError) {
        console.error('[Exchange] Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching Exchange emails:', error)
      return {
        emails: [],
        totalCount: 0,
        page: pagination?.page || 0,
        pageSize: pagination?.pageSize || 20,
        hasMore: false
      }
    }
  }
  
  /**
   * Count emails in a folder or matching a query
   */
  async countEmails(query?: EmailQuery): Promise<number> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        console.error('Not authenticated with Exchange');
        return 0;
      }
    }
    
    try {
      // Check if we have proper configuration
      if (!this.account.server) {
        throw new Error('Exchange server URL is required');
      }
      
      // Use folder if provided, otherwise default to inbox
      const folder = query?.folder || 'inbox';
      
      // Prepare API endpoint for the folder
      const endpoint = `${this.account.server}/api/v2.0/me/mailFolders/${folder}/messages/$count`;
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Accept': 'application/json'
      };
      
      // Build query parameters if needed
      const params = new URLSearchParams();
      
      if (query?.query) {
        params.append('$search', `"${query.query}"`);
      }
      
      if (query?.unreadOnly) {
        params.append('$filter', 'isRead eq false');
      }
      
      // Make the request
      console.log(`[Exchange] Counting emails in ${folder}`);
      const url = `${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Exchange] Count error:', errorText);
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response - Exchange returns the count directly as a number
      const count = await response.json();
      
      console.log(`[Exchange] Found ${count} emails in ${folder}`);
      return count;
    } catch (error) {
      console.error('[Exchange] Error counting emails:', error);
      return 0;
    }
  }
  
  /**
   * Get folder counts without fetching email content
   */
  async getFolderCounts(): Promise<Record<string, number>> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        console.error('Not authenticated with Exchange');
        return {};
      }
    }
    
    try {
      // Standard folders to get counts for
      const standardFolders = ['inbox', 'sentitems', 'drafts', 'deleteditems', 'junkemail'];
      const result: Record<string, number> = {};
      
      // Map Exchange folder names to our app's folder names
      const folderMap: Record<string, string> = {
        'inbox': 'inbox',
        'sentitems': 'sent',
        'drafts': 'drafts',
        'deleteditems': 'trash',
        'junkemail': 'spam'
      };
      
      // Check if we have proper configuration
      if (!this.account.server) {
        throw new Error('Exchange server URL is required');
      }
      
      // Get all mail folders with their message counts in one request
      const endpoint = `${this.account.server}/api/v2.0/me/mailFolders`;
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Accept': 'application/json'
      };
      
      // Make the request
      console.log(`[Exchange] Getting folder counts`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Exchange] Get folders error:', errorText);
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Extract folder counts
      for (const folder of data.value || []) {
        const exchangeFolderName = folder.displayName.toLowerCase().replace(/\s/g, '');
        
        // If this is a standard folder we care about, add it to the result
        if (standardFolders.includes(exchangeFolderName)) {
          const appFolderName = folderMap[exchangeFolderName] || exchangeFolderName;
          result[appFolderName] = folder.totalItemCount || 0;
        }
      }
      
      console.log('[Exchange] Folder counts:', result);
      return result;
    } catch (error) {
      console.error('[Exchange] Error getting folder counts:', error);
      return {};
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
            content: email.body || ''
          },
          toRecipients: toRecipients,
          ccRecipients: ccRecipients
        },
        saveToSentItems: true
      }
      
      console.log('Sending Exchange email with body:', email.body); // Debug log
      
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
