import type { IntegrationAccount } from '~/types/models'
import type { Email, EmailPerson } from '~/stores/mail'
import { BaseMailProvider } from './BaseMailProvider'
import type { EmailQuery, EmailPagination, EmailFetchResult } from './MailProvider'
import { parseEmailAddress, decodeBase64UrlContent } from '~/utils/api/core/emailUtils'
import { markAccountForReauth } from './googleAuthUtils'

/**
 * Gmail provider implementation
 */
export class GmailProvider extends BaseMailProvider {
  private pageTokens: Record<number, string> = {}
  
  // Utility methods for handling Gmail API responses
  private extractHeader(payload: any, name: string): string | null {
    if (!payload || !payload.headers) return null;
    
    const header = payload.headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }
  
  private extractBody(payload: any): string {
    if (!payload) return '';
    
    // Check if the message has a body
    if (payload.body && payload.body.data) {
      // Decode base64 content
      return decodeBase64UrlContent(payload.body.data);
    }
    
    // Check for multipart message
    if (payload.parts && payload.parts.length > 0) {
      // Try to find HTML part first
      const htmlPart = payload.parts.find((part: any) => 
        part.mimeType === 'text/html' && part.body && part.body.data
      );
      
      if (htmlPart) {
        return decodeBase64UrlContent(htmlPart.body.data);
      }
      
      // Try to find plain text part
      const textPart = payload.parts.find((part: any) => 
        part.mimeType === 'text/plain' && part.body && part.body.data
      );
      
      if (textPart) {
        const plainText = decodeBase64UrlContent(textPart.body.data);
        // Convert plain text to simple HTML with line breaks
        return plainText.replace(/\n/g, '<br>');
      }
      
      // Recursively check nested parts
      for (const part of payload.parts) {
        if (part.parts) {
          const nestedBody = this.extractBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }
    
    return '';
  }
  
  // Map our folder names to Gmail API label IDs
  private mapFolderToGmailLabel(folder: string): string {
    switch (folder) {
      case 'inbox': return 'INBOX'
      case 'sent': return 'SENT'
      case 'drafts': return 'DRAFT'
      case 'trash': return 'TRASH'
      case 'spam': return 'SPAM'
      default: return folder.toUpperCase()
    }
  }
  
  // Build Gmail search query from EmailQuery object
  private buildSearchQuery(query: EmailQuery): string {
    const parts: string[] = [];
    
    // Add folder constraint
    if (query.folder) {
      parts.push(`in:${this.mapFolderToGmailLabel(query.folder)}`);
    }
    
    // Add text search
    if (query.query) {
      // Simple text search - Gmail will search in subject and body
      parts.push(query.query);
    }
    
    // Add date constraints
    if (query.fromDate) {
      parts.push(`after:${query.fromDate.toISOString().split('T')[0]}`);
    }
    
    if (query.toDate) {
      parts.push(`before:${query.toDate.toISOString().split('T')[0]}`);
    }
    
    // Add unread filter
    if (query.unreadOnly) {
      parts.push('is:unread');
    }
    
    // Add from filter
    if (query.from) {
      parts.push(`from:${query.from}`);
    }
    
    // Add to filter
    if (query.to) {
      parts.push(`to:${query.to}`);
    }
    
    return parts.join(' ');
  }
  
  override isAuthenticated(): boolean {
    // console.log(`GmailProvider.isAuthenticated check for ${this.account.oauthData.email}:`, {
    //   hasAccessToken: !!this.account.oauthData.accessToken,
    //   tokenExpiry: this.account.oauthData.tokenExpiry,
    //   currentTime: new Date(),
    //   isTokenExpired: this.account.oauthData.tokenExpiry ? new Date(this.account.oauthData.tokenExpiry) < new Date() : 'No expiry set',
    //   scope: this.account.oauthData.scope,
    // }, this.account);
    
    // First check basic authentication with parent method
    if (!super.isAuthenticated()) {
      return false
    }
    
    // Verify proper Gmail scopes if scope is specified
    if (this.account.oauthData.scope) {
      const hasGmailScope = 
        this.account.oauthData.scope.includes('gmail.readonly') || 
        this.account.oauthData.scope.includes('gmail.send') || 
        this.account.oauthData.scope.includes('gmail.modify') || 
        this.account.oauthData.scope.includes('gmail.labels') ||
        this.account.oauthData.scope.includes('https://www.googleapis.com/auth/gmail.readonly');
        
      if (!hasGmailScope) {
        console.warn(`${this.account.oauthData.email}: Gmail account missing required scopes:`, this.account.oauthData.scope);
        return false;
      }
    }
    
    console.log(`${this.account.oauthData.email}: Authentication valid`);
    return true;
  }
  
  /**
   * Count emails in a folder or matching a query
   */
  async countEmails(query?: EmailQuery): Promise<number> {
    try {
      // Use folder if provided, otherwise default to inbox
      const folder = query?.folder || 'inbox';
      
      // Build search query
      const searchQuery = query ? this.buildSearchQuery(query) : `in:${this.mapFolderToGmailLabel(folder)}`;
      
      // API endpoint for Gmail
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages`;
      
      // Prepare query parameters - we only need the count, not the actual messages
      const params = {
        q: searchQuery,
        // Just get message IDs, not content
        fields: 'resultSizeEstimate'
      };
      
      console.log(`[Gmail] Counting emails with query: ${searchQuery}`);
      
      // Use the makeRequest helper from BaseProvider that handles auth and retries
      const data = await this.makeRequest<any>(endpoint, {
        method: 'GET',
        params
      });
      
      const count = data.resultSizeEstimate || 0;
      
      console.log(`[Gmail] Found ${count} emails matching query`);
      return count;
    } catch (error) {
      console.error('[Gmail] Error counting emails:', error);
      return 0;
    }
  }
  
  /**
   * Get counts for all folders without fetching email content
   */
  async getFolderCounts(): Promise<Record<string, number>> {
    try {
      // Standard folders to get counts for
      const standardFolders = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
      const result: Record<string, number> = {};
      
      // Get counts for each folder in parallel
      // Our countEmails method already uses makeRequest, which handles authentication
      const countPromises = standardFolders.map(async (folder) => {
        const count = await this.countEmails({ folder });
        return { folder, count };
      });
      
      const counts = await Promise.all(countPromises);
      
      // Convert array of results to record object
      counts.forEach(({ folder, count }) => {
        result[folder] = count;
      });
      
      console.log('[Gmail] Folder counts:', result);
      return result;
    } catch (error) {
      console.error('[Gmail] Error getting folder counts:', error);
      return {};
    }
  }
  
  /**
   * Fetch emails with pagination and search support
   * Gmail API's pagination uses page tokens rather than page numbers
   */
  async fetchEmails(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult> {
    try {
      // Default values
      const folder = query?.folder || 'inbox';
      const pageSize = pagination?.pageSize || 20;
      const page = pagination?.page || 0;
      
      // Build search query
      const searchQuery = query ? this.buildSearchQuery(query) : `in:${this.mapFolderToGmailLabel(folder)}`;
      
      // Get total count for pagination info
      const totalCount = await this.countEmails(query);
      
      // API endpoint for Gmail
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages`;
      
      // Prepare query parameters
      const paramsObj: Record<string, string> = {
        q: searchQuery,
        maxResults: pageSize.toString()
      };
      
      // For Gmail, we need to handle pagination differently since it uses page tokens
      // We'll manage page tokens in store state
      if (page > 0 && this.pageTokens && this.pageTokens[page - 1]) {
        paramsObj.pageToken = this.pageTokens[page - 1];
      } else if (page > 0) {
        // If we don't have a token for the requested page but page > 0,
        // we need to start from page 0 and work our way up
        console.log(`[Gmail] No token for page ${page}, starting from page 0`);
        return this.fetchEmailsFromStart(query, pagination);
      }
      
      console.log(`[Gmail] Fetching emails with query: ${searchQuery}, page: ${page}, pageSize: ${pageSize}`);
      
      // Use the makeRequest helper from BaseProvider that handles auth and retries
      const data = await this.makeRequest<any>(endpoint, {
        method: 'GET',
        params: paramsObj
      });
      
      const messageIds: string[] = data.messages?.map((msg: any) => msg.id) || [];
      const nextPageToken = data.nextPageToken;
      
      // Store the next page token for future use
      if (nextPageToken) {
        if (!this.pageTokens) this.pageTokens = {};
        this.pageTokens[page] = nextPageToken;
      }
      
      console.log(`[Gmail] Retrieved ${messageIds.length} message IDs, nextPageToken: ${nextPageToken || 'none'}`);
      
      // If no messages, return empty result
      if (messageIds.length === 0) {
        return {
          emails: [],
          totalCount,
          page,
          pageSize,
          hasMore: false
        };
      }
      
      // Now fetch each message's details (in parallel for better performance)
      const emails: Email[] = [];
      const fetchPromises = messageIds.map(messageId => this.fetchSingleEmail(messageId, folder));
      const emailResults = await Promise.all(fetchPromises);
      
      // Filter out failed fetches and add successful ones to the result
      for (const email of emailResults) {
        if (email) {
          emails.push(email);
        }
      }
      
      console.log(`[Gmail] Successfully processed ${emails.length} emails`);
      
      // Return result with pagination info
      return {
        emails,
        totalCount,
        page,
        pageSize,
        hasMore: !!nextPageToken
      };
    } catch (error) {
      console.error('[Gmail] Error fetching emails:', error);
      return {
        emails: [],
        totalCount: 0,
        page: pagination?.page || 0,
        pageSize: pagination?.pageSize || 20,
        hasMore: false
      };
    }
  }
  
  /**
   * Helper to fetch a single email by ID
   */
  private async fetchSingleEmail(messageId: string, folder: string): Promise<Email | null> {
    try {
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
      
      // Use the makeRequest helper from BaseProvider that handles auth and retries
      const msgData = await this.makeRequest<any>(endpoint, {
        method: 'GET',
        params: {
          format: 'full'
        }
      });
      
      // Convert Gmail message to Email object
      return {
        id: msgData.id || `gmail-${Date.now()}`,
        subject: this.extractHeader(msgData.payload, 'Subject') || '(No subject)',
        from: parseEmailAddress(this.extractHeader(msgData.payload, 'From') || ''),
        to: [parseEmailAddress(this.extractHeader(msgData.payload, 'To') || '')],
        body: this.extractBody(msgData.payload) || '',
        date: new Date(parseInt(msgData.internalDate || Date.now().toString())),
        read: !msgData.labelIds?.includes('UNREAD'),
        folder,
        accountId: this.account.id
      };
    } catch (error) {
      console.error(`[Gmail] Error fetching message ${messageId}:`, error);
      return null;
    }
  }
  
  /**
   * Fetch emails from page 0 and sequentially get tokens
   * until we reach the desired page
   */
  private async fetchEmailsFromStart(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult> {
    const targetPage = pagination?.page || 0;
    
    // If target is page 0, just do a normal fetch
    if (targetPage === 0) {
      return this.fetchEmails(query, { page: 0, pageSize: pagination?.pageSize || 20 });
    }
    
    // Start from page 0
    let currentPage = 0;
    let result: EmailFetchResult;
    
    // Reset page tokens
    this.pageTokens = {};
    
    // Keep fetching pages until we reach the target page
    do {
      // Fetch current page
      result = await this.fetchEmails(query, { 
        page: currentPage, 
        pageSize: pagination?.pageSize || 20 
      });
      
      // Move to next page if there is one
      if (result.hasMore) {
        currentPage++;
      } else {
        // No more pages available, return last page
        return result;
      }
      
    } while (currentPage < targetPage);
    
    // Now fetch the target page with the correct token
    return this.fetchEmails(query, pagination);
  }
  
  async sendEmail(email: Email): Promise<boolean> {
    try {
      console.log(`[Gmail] Sending email "${email.subject}" to ${email.to.map(t => t.email).join(', ')}`);
      
      // API endpoint for Gmail
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;
      
      // Create raw email content
      const toAddresses = email.to.map(recipient => 
        `${recipient.name} <${recipient.email}>`
      ).join(', ');
      
      const ccAddresses = email.cc?.map(recipient => 
        `${recipient.name} <${recipient.email}>`
      ).join(', ');
      
      // Build RFC822 email
      let rawEmail = [
        `From: ${email.from.name} <${email.from.email}>`,
        `To: ${toAddresses}`,
        email.cc?.length ? `Cc: ${ccAddresses}` : '',
        `Subject: ${email.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        email.body || ''
      ].filter(Boolean).join('\r\n');
      
      // In browser, we need to use TextEncoder
      const encoder = new TextEncoder();
      const rawData = encoder.encode(rawEmail);
      
      // Convert to base64url
      const base64url = btoa(
        Array.from(new Uint8Array(rawData))
          .map(b => String.fromCharCode(b))
          .join('')
      ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      // Debug log for the request we're about to send
      console.log('[Gmail] Sending email request', {
        to: email.to.map(t => t.email).join(', '),
        subject: email.subject,
        bodyLength: email.body ? email.body.length : 0
      });
      
      // Use the makeRequest helper from BaseProvider that handles auth and retries
      await this.makeRequest(endpoint, {
        method: 'POST',
        body: {
          raw: base64url
        }
      });
      
      console.log('[Gmail] Email sent successfully');
      return true;
    } catch (error) {
      console.error('[Gmail] Error sending email:', error);
      return false;
    }
  }
}
