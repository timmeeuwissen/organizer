import type { IntegrationAccount } from '~/types/models'
import type { Email, EmailPerson } from '~/stores/mail'
import { refreshOAuthToken } from '~/utils/api/emailUtils'
import type { MailProvider } from './MailProvider'

/**
 * Gmail provider implementation
 */
export class GmailProvider implements MailProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }
  
  // Utility methods for handling Gmail API responses
  private extractHeader(payload: any, name: string): string | null {
    if (!payload || !payload.headers) return null;
    
    const header = payload.headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }
  
  private parseEmailAddress(addressString: string): EmailPerson {
    if (!addressString) {
      return { name: 'Unknown', email: 'unknown@example.com' };
    }
    
    // Try to match "Name <email@example.com>" format
    const match = addressString.match(/^([^<]+)<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim()
      };
    }
    
    // If no match, just use the whole string as both name and email
    return {
      name: addressString,
      email: addressString
    };
  }
  
  private extractBody(payload: any): string {
    if (!payload) return '';
    
    // Check if the message has a body
    if (payload.body && payload.body.data) {
      // Decode base64 content
      return this.decodeBase64UrlContent(payload.body.data);
    }
    
    // Check for multipart message
    if (payload.parts && payload.parts.length > 0) {
      // Try to find HTML part first
      const htmlPart = payload.parts.find((part: any) => 
        part.mimeType === 'text/html' && part.body && part.body.data
      );
      
      if (htmlPart) {
        return this.decodeBase64UrlContent(htmlPart.body.data);
      }
      
      // Try to find plain text part
      const textPart = payload.parts.find((part: any) => 
        part.mimeType === 'text/plain' && part.body && part.body.data
      );
      
      if (textPart) {
        const plainText = this.decodeBase64UrlContent(textPart.body.data);
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
  
  private decodeBase64UrlContent(encoded: string): string {
    try {
      // Convert base64url to base64
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      const paddingLength = (4 - (base64.length % 4)) % 4;
      const paddedBase64 = base64 + '='.repeat(paddingLength);
      
      // Decode and convert to UTF-8 string
      const rawData = atob(paddedBase64);
      return decodeURIComponent(
        Array.from(rawData)
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (e) {
      console.error('Error decoding base64 content:', e);
      return '[Content could not be decoded]';
    }
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
  
  isAuthenticated(): boolean {
    console.log(`GmailProvider.isAuthenticated check for ${this.account.email}:`, {
      hasAccessToken: !!this.account.accessToken,
      tokenExpiry: this.account.tokenExpiry,
      currentTime: new Date(),
      isTokenExpired: this.account.tokenExpiry && new Date(this.account.tokenExpiry) < new Date(),
      scope: this.account.scope
    });
    
    // Check access token
    if (!this.account.accessToken) {
      console.log(`${this.account.email}: No access token found`);
      return false;
    }
    
    // Check token expiry
    if (this.account.tokenExpiry && new Date(this.account.tokenExpiry) < new Date()) {
      console.log(`${this.account.email}: Token expired`);
      return false;
    }
    
    // Verify proper Gmail scopes if scope is specified
    if (this.account.scope) {
      const hasGmailScope = 
        this.account.scope.includes('gmail.readonly') || 
        this.account.scope.includes('gmail.send') || 
        this.account.scope.includes('gmail.modify') || 
        this.account.scope.includes('gmail.labels') ||
        this.account.scope.includes('https://www.googleapis.com/auth/gmail.readonly');
        
      if (!hasGmailScope) {
        console.warn(`${this.account.email}: Gmail account missing required scopes:`, this.account.scope);
        return false;
      }
    }
    
    console.log(`${this.account.email}: Authentication valid`);
    return true;
  }
  
  async authenticate(): Promise<boolean> {
    console.log(`GmailProvider.authenticate for ${this.account.email}`);
    
    if (this.isAuthenticated()) {
      console.log(`${this.account.email} is already authenticated`);
      return true;
    }
    
    // Standard OAuth refresh flow for any account with a refresh token
    if (this.account.refreshToken) {
      try {
        this.account = await refreshOAuthToken(this.account);
        console.log(`Successfully refreshed token for ${this.account.email}`);
        return true;
      } catch (error) {
        console.error(`Failed to refresh token for ${this.account.email}:`, error);
        return false;
      }
    }
    
    console.warn(`${this.account.email} has no refresh token, would need to redirect to OAuth flow`);
    // Would need to redirect user to OAuth flow
    return false;
  }
  
  async fetchEmails(folder: string = 'inbox', maxResults: number = 50): Promise<Email[]> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Gmail')
        return []
      }
    }
    
    try {
      // Using Gmail API via direct fetch
      console.log(`[Gmail] Fetching ${maxResults} emails from ${folder} folder for ${this.account.email}`)
      
      // Map our folder names to Gmail labels
      console.log(`[Gmail] folder is ${folder}`)
      const labelId = this.mapFolderToGmailLabel(folder)
      console.log(`[Gmail] label ID is: ${labelId}`)
      
      // API endpoint for Gmail
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages`;
      
      // Prepare query parameters
      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        q: `in:${labelId}`
      });
      
      // Fetch message IDs first
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      const url = `${endpoint}?${params.toString()}`;
      console.log(`[Gmail] Making API request to: ${url}`);
      
      // Safely log a portion of the access token for debugging
      const tokenPreview = this.account.accessToken 
        ? `Bearer ${this.account.accessToken.substring(0, 10)}...` 
        : 'Missing access token';
      console.log('[Gmail] Authorization header:', tokenPreview);
      
      // Make the request
      let data;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: headers,
        });
        
        console.log('[Gmail] Response status:', response.status);
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Gmail] HTTP error response:', errorText);
          throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
        }
        
        // Parse the response
        data = await response.json();
      } catch (fetchError) {
        console.error('[Gmail] Fetch error:', fetchError);
        throw fetchError;
      }
      
      console.log(`[Gmail] Retrieved ${data?.messages?.length || 0} message IDs`);
      
      const messageIds = data?.messages?.map((msg: any) => msg.id) || [];
      if (messageIds.length === 0) {
        console.log(`[Gmail] No messages found in ${folder}`);
        return [];
      }
      
      // Now fetch each message's details
      const emails: Email[] = [];
      
      // Limit to 20 emails for performance
      const messagesToFetch = messageIds.slice(0, Math.min(messageIds.length, 20));
      
      for (const messageId of messagesToFetch) {
        try {
          const messageResponse = await fetch(`${endpoint}/${messageId}?format=full`, {
            method: 'GET',
            headers: headers
          });
          
          if (!messageResponse.ok) {
            console.error(`[Gmail] Failed to fetch message ${messageId}:`, 
              messageResponse.status, messageResponse.statusText);
            continue;
          }
          
          const msgData = await messageResponse.json();
          
          // Convert Gmail message to Email object
          const email: Email = {
            id: msgData.id || `gmail-${Date.now()}`,
            subject: this.extractHeader(msgData.payload, 'Subject') || '(No subject)',
            from: this.parseEmailAddress(this.extractHeader(msgData.payload, 'From') || ''),
            to: [this.parseEmailAddress(this.extractHeader(msgData.payload, 'To') || '')],
            body: this.extractBody(msgData.payload) || '',
            date: new Date(parseInt(msgData.internalDate || Date.now().toString())),
            read: !msgData.labelIds?.includes('UNREAD'),
            folder,
            accountId: this.account.id
          };
          
          emails.push(email);
        } catch (messageError) {
          console.error(`[Gmail] Error fetching message ${messageId}:`, messageError);
        }
      }
      
      console.log(`[Gmail] Successfully processed ${emails.length} emails`);
      return emails;
    } catch (error) {
      console.error('[Gmail] Error fetching emails:', error);
      return [];
    }
  }
  
  async sendEmail(email: Email): Promise<boolean> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Gmail')
        return false
      }
    }
    
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
        email.body
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
      
      // Prepare request with auth
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Send the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          raw: base64url
        })
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gmail] Send mail error:', errorText);
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }
      
      console.log('[Gmail] Email sent successfully');
      return true;
    } catch (error) {
      console.error('[Gmail] Error sending email:', error);
      return false;
    }
  }
}
