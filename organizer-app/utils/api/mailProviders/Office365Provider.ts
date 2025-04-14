import type { IntegrationAccount } from '~/types/models'
import type { Email, EmailPerson } from '~/stores/mail'
import { refreshOAuthToken } from '~/utils/api/emailUtils'
import type { MailProvider, EmailQuery, EmailPagination, EmailFetchResult } from './MailProvider'

/**
 * Microsoft Office 365 provider implementation using direct fetch API
 */
export class Office365Provider implements MailProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }
  
  isAuthenticated(): boolean {
    console.log(`Office365Provider.isAuthenticated check for ${this.account.email}:`, {
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
        console.error('Failed to refresh Office 365 token:', error)
        return false
      }
    }
    
    // Would need to redirect user to OAuth flow
    return false
  }
  
  // Map our folder names to Microsoft Graph API folder names
  private mapFolderToOffice365Folder(folder: string): string {
    switch (folder) {
      case 'inbox': return 'inbox'
      case 'sent': return 'sentItems'
      case 'drafts': return 'drafts'
      case 'trash': return 'deletedItems'
      case 'spam': return 'junkEmail'
      default: return folder
    }
  }
  
  /**
   * Fetch emails with pagination and search support
   */
  async fetchEmails(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Office 365')
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
      
      // Using Microsoft Graph API directly with fetch
      console.log(`[Office 365] Fetching emails from ${folder} folder (page ${page}, pageSize ${pageSize}) for ${this.account.email}`)
      
      // Map our folder names to Microsoft Graph folder names
      const graphFolder = this.mapFolderToOffice365Folder(folder)
      console.log(`[Office 365] Using folder: ${graphFolder}`)
      
      // Get total count for pagination info first
      const totalCount = await this.countEmails(query);
      
      // Prepare API endpoint for Microsoft Graph
      const endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${graphFolder}/messages`
      
      // Prepare query parameters
      const params = new URLSearchParams({
        '$top': pageSize.toString(),
        '$skip': (page * pageSize).toString(),
        '$orderby': 'receivedDateTime desc',
        '$select': 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,bodyPreview,isRead',
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
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Log authentication info
      const tokenPreview = this.account.accessToken 
        ? `Bearer ${this.account.accessToken.substring(0, 10)}...` 
        : 'Missing access token';
      console.log(`[Office 365] Using auth token: ${tokenPreview}`);
      
      const url = `${endpoint}?${params.toString()}`;
      console.log(`[Office 365] Making Graph API request to: ${url}`);
      
      // Make the request
      let data;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });
        
        console.log('[Office 365] Response status:', response.status);
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Office 365] HTTP error response:', errorText);
          throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
        }
        
        // Parse the response
        data = await response.json();
      } catch (fetchError) {
        console.error('[Office 365] Fetch error:', fetchError);
        throw fetchError;
      }
      
      console.log(`[Office 365] Retrieved ${data?.value?.length || 0} messages`);
      
      // Get the next page token if it exists
      const nextPageToken = data['@odata.nextLink'];
      const hasMore = !!nextPageToken || (page + 1) * pageSize < totalCount;
      
      // Process the messages
      const emails: Email[] = (data?.value || []).map((message: any) => {
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
          cc: message.ccRecipients?.map((recipient: any) => ({
            name: recipient.emailAddress?.name || 'Unknown',
            email: recipient.emailAddress?.address || 'unknown@example.com'
          })),
          body: message.body?.content || message.bodyPreview || '',
          date: new Date(message.receivedDateTime),
          read: message.isRead,
          folder,
          accountId: this.account.id
        };
      });
      
      console.log(`[Office 365] Successfully processed ${emails.length} emails`);
      
      return {
        emails,
        totalCount,
        page,
        pageSize,
        hasMore
      };
    } catch (error) {
      console.error('[Office 365] Error fetching emails:', error)
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
        console.error('Not authenticated with Office 365');
        return 0;
      }
    }
    
    try {
      // Use folder if provided, otherwise default to inbox
      const folder = query?.folder || 'inbox';
      
      // Map our folder names to Microsoft Graph folder names
      const graphFolder = this.mapFolderToOffice365Folder(folder);
      
      // Prepare API endpoint for Microsoft Graph
      const endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${graphFolder}/messages/$count`;
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Accept': 'application/json',
        'ConsistencyLevel': 'eventual' // Required for $count
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
      console.log(`[Office 365] Counting emails in ${folder}`);
      const url = `${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Office 365] Count error:', errorText);
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response - should be a plain number
      const count = await response.json();
      
      console.log(`[Office 365] Found ${count} emails in ${folder}`);
      return count;
    } catch (error) {
      console.error('[Office 365] Error counting emails:', error);
      
      // Alternative approach: if $count endpoint is not available, we'll fetch just the IDs with a large page size
      try {
        const folder = query?.folder || 'inbox';
        const graphFolder = this.mapFolderToOffice365Folder(folder);
        
        const endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${graphFolder}/messages`;
        
        const params = new URLSearchParams({
          '$select': 'id', // Only get IDs to minimize data transfer
          '$top': '1000' // Get a large number to estimate total count
        });
        
        if (query?.query) {
          params.append('$search', `"${query.query}"`);
        }
        
        if (query?.unreadOnly) {
          params.append('$filter', 'isRead eq false');
        }
        
        const headers = {
          'Authorization': `Bearer ${this.account.accessToken}`,
          'Accept': 'application/json'
        };
        
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          method: 'GET',
          headers: headers
        });
        
        if (!response.ok) {
          return 0; // If this fails too, just return 0
        }
        
        const data = await response.json();
        return data.value?.length || 0;
      } catch (fallbackError) {
        console.error('[Office 365] Error in count fallback method:', fallbackError);
        return 0;
      }
    }
  }
  
  /**
   * Get folder counts without fetching email content
   */
  async getFolderCounts(): Promise<Record<string, number>> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        console.error('Not authenticated with Office 365');
        return {};
      }
    }
    
    try {
      // Standard folders to get counts for
      const standardFolders = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
      const result: Record<string, number> = {};
      
      // Map Office 365 folder names to our app's folder names
      const folderMap: Record<string, string> = {
        'inbox': 'inbox',
        'sentitems': 'sent',
        'drafts': 'drafts',
        'deleteditems': 'trash',
        'junkemail': 'spam'
      };
      
      // Get all mail folders with their counts in one request
      const endpoint = 'https://graph.microsoft.com/v1.0/me/mailFolders';
      
      // Include child folders and counts
      const params = new URLSearchParams({
        '$select': 'displayName,childFolderCount,totalItemCount',
        '$top': '25'
      });
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Accept': 'application/json'
      };
      
      // Make the request
      console.log(`[Office 365] Getting folder counts`);
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers: headers
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Office 365] Get folders error:', errorText);
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Extract folder counts
      for (const folder of data.value || []) {
        // Find if this folder name maps to one of our standard folders
        const officeFolderName = folder.displayName.toLowerCase().replace(/\s+/g, '');
        
        for (const [graphName, appName] of Object.entries(folderMap)) {
          if (officeFolderName === graphName || officeFolderName.includes(graphName)) {
            result[appName] = folder.totalItemCount || 0;
            break;
          }
        }
      }
      
      console.log('[Office 365] Folder counts:', result);
      return result;
    } catch (error) {
      console.error('[Office 365] Error getting folder counts:', error);
      return {};
    }
  }
  
  async sendEmail(email: Email): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Office 365')
        return false
      }
    }
    
    try {
      // Using Microsoft Graph API with direct fetch
      console.log(`[Office 365] Sending email "${email.subject}" to ${email.to.map(t => t.email).join(', ')}`)
      
      // Prepare API endpoint for Microsoft Graph
      const endpoint = 'https://graph.microsoft.com/v1.0/me/sendMail';
      
      // Prepare headers with authentication
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      
      // Convert email to Microsoft Graph format
      const toRecipients = email.to.map(recipient => ({
        emailAddress: {
          address: recipient.email,
          name: recipient.name
        }
      }));
      
      const ccRecipients = email.cc?.map(recipient => ({
        emailAddress: {
          address: recipient.email,
          name: recipient.name
        }
      })) || [];
      
      // Prepare the email payload
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
      };
      
      console.log('Sending Office365 email with body:', email.body); // Debug log
      
      // Log sending attempt
      console.log('[Office 365] Sending email via Microsoft Graph API');
      
      // Make the request
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
        
        console.log('[Office 365] Send response status:', response.status);
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Office 365] Send mail error response:', errorText);
          throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
        }
        
        console.log('[Office 365] Email sent successfully');
        return true;
      } catch (fetchError) {
        console.error('[Office 365] Send mail fetch error:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('[Office 365] Error sending email:', error)
      return false
    }
  }
}
