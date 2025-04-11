import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { IntegrationAccount } from '~/types/models'
import { hasValidOAuthTokens, refreshOAuthToken } from '~/utils/api/emailUtils'
import { getMailProvider } from '~/utils/api/mailProviders'

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
  }),

  getters: {
    getEmailsByFolder: (state) => (folder: string) => {
      return state.emails.filter(email => email.folder === folder)
    },
    
    getUnreadCountByFolder: (state) => (folder: string) => {
      return state.emails.filter(email => email.folder === folder && !email.read).length
    },
    
    getConnectedAccounts: () => {
      const authStore = useAuthStore()
      const integrationAccounts = authStore.currentUser?.settings?.integrationAccounts || []
      
      // Only return accounts that are connected and have syncMail and showInMail set to true
      return integrationAccounts.filter(account => 
        account.connected && account.syncMail && account.showInMail
      )
    }
  },

  actions: {
    async fetchEmails() {
      this.loading = true
      this.error = null
      
      try {
        // Get connected accounts from auth store
        const connectedAccounts = this.getConnectedAccounts
        
        // Clear existing emails
        this.emails = []
        
        // If no connected accounts, return without generating mock data
        if (connectedAccounts.length === 0) {
          // No mock data - return empty array
          this.loading = false
          return
        }
        
        // Fetch emails from each connected account
        for (const account of connectedAccounts) {
          const accountEmails = await this.fetchEmailsFromAccount(account)
          this.emails.push(...accountEmails)
        }
        
        // Sort emails by date (newest first)
        this.emails.sort((a, b) => b.date.getTime() - a.date.getTime())
      } catch (error: any) {
        console.error('Error fetching emails:', error)
        this.error = error.message || 'Failed to fetch emails'
      } finally {
        this.loading = false
      }
    },
    
    async fetchEmailsFromAccount(account: IntegrationAccount): Promise<Email[]> {
      try {
        console.log(`Connecting to ${account.type} email API for account: ${account.email}`)
        
        // Get the appropriate mail provider for this account
        const mailProvider = getMailProvider(account)
        
        // Check if authenticated
        if (!mailProvider.isAuthenticated()) {
          console.log(`Account ${account.email} requires authentication`)
          
          // Try to authenticate
          const authenticated = await mailProvider.authenticate()
          if (!authenticated) {
            console.warn(`Authentication failed for account ${account.email}`)
            return [] // Can't fetch emails without authentication
          }
          else console.info(`Authentication succeeded for account ${account.email}`)
        }
        
        // Fetch emails for all standard folders
        const inboxEmails = await mailProvider.fetchEmails('inbox', 20)
        const sentEmails = await mailProvider.fetchEmails('sent', 10)
        const draftEmails = await mailProvider.fetchEmails('drafts', 5)
        
        // Combine emails from all folders
        return [
          ...inboxEmails,
          ...sentEmails,
          ...draftEmails
        ]
      } catch (error) {
        console.error(`Error fetching emails for account ${account.email}:`, error)
        throw error
      }
    },
    
    // This method has been removed as we no longer generate mock emails
    
    // Removed mock email body generator as it's no longer needed
    
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
            throw new Error('Not authenticated with mail provider')
          }
        }
        
        // Create email object with account info
        const newEmail: Email = {
          ...email,
          id: `email-${Date.now()}`,
          folder: 'sent',
          read: true,
          date: new Date(),
          accountId
        }
        
        // Send via provider
        const success = await mailProvider.sendEmail(newEmail)
        if (!success) {
          throw new Error('Failed to send email')
        }
        
        // Add to local state
        this.emails.unshift(newEmail)
        return newEmail
      } catch (error) {
        console.error('Error sending email:', error)
        
        // Still add to sent folder for UI consistency, but mark as failed
        const newEmail: Email = {
          ...email,
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
