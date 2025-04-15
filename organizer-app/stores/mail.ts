import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { IntegrationAccount } from '~/types/models'
import { hasValidOAuthTokens, refreshOAuthToken } from '~/utils/api/emailUtils'
import { getMailProvider } from '~/utils/api/mailProviders'
import type { EmailQuery, EmailPagination, EmailFetchResult } from '~/utils/api/mailProviders/MailProvider'

// Mail types
export interface EmailPerson {
  name: string
  email: string
}

export interface EmailAttachment {
  name: string
  size: number
  url: string
}

export interface Email {
  id: string
  subject: string
  from: EmailPerson
  to: EmailPerson[]
  cc?: EmailPerson[]
  body: string
  date: Date
  read: boolean
  folder: string
  attachments?: EmailAttachment[]
  labels?: string[]
  accountId?: string
}

export interface MailFolder {
  id: string
  name: string
  icon: string
}

export const useMailStore = defineStore('mail', {
  state: () => ({
    emails: [] as Email[],
    folders: [
      { id: 'inbox', name: 'Inbox', icon: 'mdi-inbox' },
      { id: 'sent', name: 'Sent', icon: 'mdi-send' },
      { id: 'drafts', name: 'Drafts', icon: 'mdi-file-document-outline' },
      { id: 'trash', name: 'Trash', icon: 'mdi-delete' },
      { id: 'spam', name: 'Spam', icon: 'mdi-alert-circle' },
    ] as MailFolder[],
    loading: false,
    error: null as string | null,
    // Pagination state
    currentPage: 0,
    pageSize: 20,
    totalEmails: 0,
    hasMoreEmails: false,
    // Current folder and query
    currentFolder: 'inbox',
    currentQuery: null as EmailQuery | null,
    // Folder counts from server
    folderCounts: {} as Record<string, number>,
    unreadCounts: {} as Record<string, number>,
  }),

  getters: {
    getEmailsByFolder: (state) => (folder: string) => {
      return state.emails.filter(email => email.folder === folder)
    },
    
    getUnreadCountByFolder: (state) => (folder: string) => {
      // If we have server-side counts, use those
      if (state.unreadCounts[folder] !== undefined) {
        return state.unreadCounts[folder];
      }
      // Fall back to local counts if necessary
      return state.emails.filter(email => email.folder === folder && !email.read).length
    },
    
    getConnectedAccounts: () => {
      const authStore = useAuthStore()
      const integrationAccounts = authStore.currentUser?.settings?.integrationAccounts || []

      // Only return accounts that are connected and have syncMail and showInMail set to true
      return integrationAccounts.filter(account => 
        account.oauthData.connected && account.syncMail && account.showInMail
      )
    },

    paginationInfo: (state) => {
      return {
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        totalPages: Math.ceil(state.totalEmails / state.pageSize),
        totalEmails: state.totalEmails,
        hasMoreEmails: state.hasMoreEmails
      }
    }
  },

  actions: {
    /**
     * Load folder counts without fetching complete email content
     * This is useful for sidebar unread counts
     */
    async loadFolderCounts() {
      // Only try if we have connected accounts
      const connectedAccounts = this.getConnectedAccounts;
      if (connectedAccounts.length === 0) {
        return;
      }
      
      try {
        // Get folder counts from each provider
        const folderCountPromises = connectedAccounts.map(async (account) => {
          try {
            // Get mail provider
            const mailProvider = getMailProvider(account);
            
            // Try to authenticate if needed
            if (!mailProvider.isAuthenticated()) {
              const authenticated = await mailProvider.authenticate();
              if (!authenticated) {
                console.warn(`Authentication failed for account ${account.email}`);
                return null;
              }
            }
            
            // Get folder counts
            return await mailProvider.getFolderCounts();
          } catch (error) {
            console.error(`Error getting folder counts for ${account.email}:`, error);
            return null;
          }
        });
        
        // Wait for all promises to resolve
        const allFolderCounts = await Promise.all(folderCountPromises);
        
        // Merge counts from all accounts
        let totalCounts: Record<string, number> = {};
        let unreadCounts: Record<string, number> = {};
        
        // Initialize with zero counts for all standard folders
        for (const folder of this.folders) {
          totalCounts[folder.id] = 0;
          unreadCounts[folder.id] = 0;
        }
        
        // Get unread counts for each folder and account
        for (const account of connectedAccounts) {
          try {
            // Get mail provider
            const mailProvider = getMailProvider(account);
            
            // Try to authenticate if needed
            if (!mailProvider.isAuthenticated()) {
              const authenticated = await mailProvider.authenticate();
              if (!authenticated) continue;
            }
            
            // Check each folder for unread count - we'll do this in parallel for better performance
            const unreadCountPromises = this.folders.map(async folder => {
              const unreadCount = await mailProvider.countEmails({
                folder: folder.id,
                unreadOnly: true
              });
              
              return { folder: folder.id, count: unreadCount };
            });
            
            // Wait for all unread counts to complete
            const folderUnreadCounts = await Promise.all(unreadCountPromises);
            
            // Add the counts to our running total
            for (const { folder, count } of folderUnreadCounts) {
              unreadCounts[folder] = (unreadCounts[folder] || 0) + count;
              console.log(`[Mail] Folder ${folder} unread count: ${count} (total now: ${unreadCounts[folder]})`);
            }
          } catch (error) {
            console.error(`Error getting unread counts for ${account.email}:`, error);
          }
        }
        
        // Add up counts from all accounts
        for (const counts of allFolderCounts) {
          if (counts) {
            for (const [folder, count] of Object.entries(counts)) {
              totalCounts[folder] = (totalCounts[folder] || 0) + count;
            }
          }
        }
        
        console.log('Folder counts loaded:', totalCounts);
        console.log('Unread counts loaded:', unreadCounts);
        
        // Update counts in store
        this.folderCounts = totalCounts;
        this.unreadCounts = unreadCounts;
        
        // Update total email count in store
        this.totalEmails = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);
      } catch (error) {
        console.error('Error loading folder counts:', error);
      }
    },
    
    async fetchEmails(query?: EmailQuery, pagination?: EmailPagination) {
      this.loading = true
      this.error = null
      
      try {
        // Get connected accounts from auth store
        const connectedAccounts = this.getConnectedAccounts
        
        // If no connected accounts, return without generating mock data
        if (connectedAccounts.length === 0) {
          // No mock data - return empty array
          this.loading = false
          this.emails = []
          this.totalEmails = 0
          this.hasMoreEmails = false
          return
        }
        
        // Store current query parameters for pagination
        this.currentQuery = query || { folder: 'inbox' }
        this.currentFolder = query?.folder || 'inbox'
        
        // Set pagination parameters
        const pageSetting = pagination || { page: this.currentPage, pageSize: this.pageSize }
        this.currentPage = pageSetting.page
        this.pageSize = pageSetting.pageSize
        
        // Clear existing emails when fetching a new query or when on page 0
        if (!pagination || pagination.page === 0) {
          this.emails = []
        }
        
        // Fetch emails from each connected account with the same pagination
        // This means the same page from each account, then merge and sort
        let allEmails: Email[] = []
        let totalEmailCount = 0
        let anyHasMore = false
        
        for (const account of connectedAccounts) {
          const result = await this.fetchEmailsFromAccount(account, query, pageSetting)
          allEmails.push(...result.emails)
          totalEmailCount += result.totalCount
          if (result.hasMore) {
            anyHasMore = true
          }
        }
        
        // Always replace the emails array with the new results
        // This ensures the view is updated for each page
        this.emails = allEmails
        
        // Sort emails by date (newest first)
        this.emails.sort((a, b) => b.date.getTime() - a.date.getTime())
        
        // Update pagination state
        this.totalEmails = totalEmailCount
        this.hasMoreEmails = anyHasMore
      } catch (error: any) {
        console.error('Error fetching emails:', error)
        this.error = error.message || 'Failed to fetch emails'
      } finally {
        this.loading = false
      }
    },
    
    async fetchNextPage() {
      if (!this.hasMoreEmails) return
      
      // Increment page and fetch next batch
      const nextPage = this.currentPage + 1
      await this.fetchEmails(this.currentQuery || undefined, {
        page: nextPage,
        pageSize: this.pageSize
      })
    },
    
    async fetchEmailsFromAccount(
      account: IntegrationAccount, 
      query?: EmailQuery,
      pagination?: EmailPagination
    ): Promise<EmailFetchResult> {
      try {
        console.log(`Connecting to ${account.type} email API for account: ${account.oauthData.email}`)
        
        // Create a copy of the account object to avoid modifying the original
        let workingAccount = { ...account };
        
        // No special account handling - use actual credentials from the account
        console.log(`Using real integration for ${account.oauthData.email}`);
        
        // Get the appropriate mail provider with possibly modified account
        const mailProvider = getMailProvider(workingAccount)
        
        // Check if authenticated
        if (!mailProvider.isAuthenticated()) {
          console.log(`Account ${account.oauthData.email} requires authentication`)
          
          // Try to authenticate
          const authenticated = await mailProvider.authenticate()
          if (!authenticated) {
            console.warn(`Authentication failed for account ${account.oauthData.email}`)
            return {
              emails: [],
              totalCount: 0,
              page: pagination?.page || 0,
              pageSize: pagination?.pageSize || 20,
              hasMore: false
            }; // Can't fetch emails without authentication
          }
          else console.info(`Authentication succeeded for account ${account.oauthData.email}`)
        }
        
        // Use the query if provided, otherwise default to inbox
        const emailQuery = query || { folder: 'inbox' };
        
        // Fetch emails with pagination
        try {
          console.log(`Fetching emails for ${account.oauthData.email} with query:`, emailQuery);
          const result = await mailProvider.fetchEmails(emailQuery, pagination);
          return result;
        } catch (error: any) {
          console.error(`Error fetching emails for ${account.oauthData.email}:`, error);
          // Return empty result when there's an error
          return {
            emails: [],
            totalCount: 0,
            page: pagination?.page || 0,
            pageSize: pagination?.pageSize || 20,
            hasMore: false
          };
        }
      } catch (error) {
        console.error(`Error fetching emails for account ${account.oauthData.email}:`, error)
        throw error
      }
    },
    
    markEmailAsRead(emailId: string, read: boolean = true) {
      const email = this.emails.find(e => e.id === emailId)
      if (email) {
        email.read = read
      }
    },
    
    moveEmailToFolder(emailId: string, folder: string) {
      const email = this.emails.find(e => e.id === emailId)
      if (email) {
        email.folder = folder
      }
    },
    
    deleteEmail(emailId: string) {
      const email = this.emails.find(e => e.id === emailId)
      if (email) {
        if (email.folder === 'trash') {
          // Permanently delete
          this.emails = this.emails.filter(e => e.id !== emailId)
        } else {
          // Move to trash
          email.folder = 'trash'
        }
      }
    },
    
    async sendEmail(email: Email) {
      // Get the default account to send from
      const connectedAccounts = this.getConnectedAccounts
      if (connectedAccounts.length === 0) {
        console.error('No connected accounts to send email from')
        // Update error state in the store
        this.error = 'No connected email accounts available'
        
        // Still add to sent folder for UI consistency
        const newEmail: Email = {
          ...email,
          id: `email-${Date.now()}`,
          folder: 'sent',
          read: true,
          date: new Date()
        }
        this.emails.unshift(newEmail)
        return newEmail
      }
      
      // Use the first connected account
      const account = connectedAccounts[0]
      const accountId = account.id
      
      try {
        // Get mail provider for this account
        const mailProvider = getMailProvider(account)
        
        // Check if authenticated
        if (!mailProvider.isAuthenticated()) {
          const authenticated = await mailProvider.authenticate()
          if (!authenticated) {
            this.error = 'Authentication failed. Please reconnect your email account'
            throw new Error('Not authenticated with mail provider')
          }
        }
        
        // Make sure body is defined and not null
        const emailBody = email.body || ''
        console.log('Email body from compose:', emailBody, 'Length:', emailBody.length)
        
        // Create email object with account info
        const newEmail: Email = {
          ...email,
          body: emailBody, // Ensure body is not undefined or null
          id: `email-${Date.now()}`,
          folder: 'sent',
          read: true,
          date: new Date(),
          accountId
        }
        
        // Send via provider
        const success = await mailProvider.sendEmail(newEmail)
        if (!success) {
          this.error = 'Failed to send email. Please try again'
          throw new Error('Failed to send email')
        }
        
        // Clear any previous errors on success
        this.error = null
        
        // Add to local state
        this.emails.unshift(newEmail)
        
        // Log success - UI will handle showing notifications
        console.log('[Mail] Email sent successfully')
        
        return newEmail
      } catch (error) {
        console.error('Error sending email:', error)
        
        // Log error message - UI will handle showing error notifications
        console.error('[Mail] Email sending failed:', this.error || 'Failed to send email. Please check your email settings')
        
        // Still add to sent folder for UI consistency, but mark as failed
        const newEmail: Email = {
          ...email,
          body: email.body || '', // Ensure body is not undefined or null
          id: `email-${Date.now()}`,
          folder: 'sent',
          read: true,
          date: new Date(),
          accountId
        }
        this.emails.unshift(newEmail)
        return newEmail
      }
    },
    
    async saveDraft(email: Email) {
      // Get the default account to save draft in
      const connectedAccounts = this.getConnectedAccounts
      if (connectedAccounts.length === 0) {
        console.error('No connected accounts to save draft in')
        // Still add to drafts folder for UI consistency
        const newEmail: Email = {
          ...email,
          id: `draft-${Date.now()}`,
          folder: 'drafts',
          read: true,
          date: new Date()
        }
        this.emails.unshift(newEmail)
        return newEmail
      }
      
      // Add to drafts folder
      const account = connectedAccounts[0]
      const accountId = account.id
      
      const newEmail: Email = {
        ...email,
        id: `draft-${Date.now()}`,
        folder: 'drafts',
        read: true,
        date: new Date(),
        accountId
      }
      
      // In a real implementation, we would save the draft via the provider API
      // For now, just add it to local state
      this.emails.unshift(newEmail)
      return newEmail
    }
  }
})
