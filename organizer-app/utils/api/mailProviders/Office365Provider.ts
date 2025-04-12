import type { IntegrationAccount } from '~/types/models'
import type { Email, EmailPerson } from '~/stores/mail'
import { refreshOAuthToken } from '~/utils/api/emailUtils'
import type { MailProvider } from './MailProvider'

/**
 * Microsoft Office 365 provider implementation using direct fetch API
 */
export class Office365Provider implements MailProvider {
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
  
  async fetchEmails(folder: string = 'inbox', maxResults: number = 50): Promise<Email[]> {
    if (!this.isAuthenticated()) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        console.error('Not authenticated with Office 365')
        return []
      }
    }
    
    try {
      // Using Microsoft Graph API directly with fetch
      console.log(`[Office 365] Fetching ${maxResults} emails from ${folder} folder for ${this.account.email}`)
      
      // Map our folder names to Microsoft Graph folder names
      const graphFolder = this.mapFolderToOffice365Folder(folder)
      console.log(`[Office 365] Using folder: ${graphFolder}`)
      
      // Prepare API endpoint for Microsoft Graph
      const endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${graphFolder}/messages`
      
      // Prepare query parameters
      const params = new URLSearchParams({
        '$top': maxResults.toString(),
        '$orderby': 'receivedDateTime desc',
        '$select': 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,bodyPreview,isRead'
      })
      
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
      return emails;
    } catch (error) {
      console.error('[Office 365] Error fetching emails:', error)
      return []
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
            content: email.body
          },
          toRecipients: toRecipients,
          ccRecipients: ccRecipients
        },
        saveToSentItems: true
      };
      
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
