import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { IntegrationAccount } from '~/types/models'

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
      // In a real app, this would connect to the actual email API for the account
      // For demo purposes, we'll generate mock emails for each account
      
      return this.generateMockEmailsForAccount(account)
    },
    
    generateMockEmailsForAccount(account: IntegrationAccount): Email[] {
      const mockEmails: Email[] = []
      const numEmails = 5 + Math.floor(Math.random() * 10) // 5-15 emails per account
      
      for (let i = 0; i < numEmails; i++) {
        const isRead = Math.random() > 0.3
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(Math.random() * 14)) // Random date within last 2 weeks
        
        const folder = Math.random() > 0.8 ? 
          (Math.random() > 0.5 ? 'sent' : 'drafts') : 
          'inbox'
        
        // Random sender/recipient based on account
        const fromPerson = folder === 'sent' ? 
          { name: 'Me', email: account.email } :
          { 
            name: `Contact ${i}`,
            email: `contact${i}@${account.type === 'google' ? 'gmail.com' : 'example.com'}`
          }
        
        const toPerson = folder === 'sent' ? 
          { 
            name: `Contact ${i}`,
            email: `contact${i}@${account.type === 'google' ? 'gmail.com' : 'example.com'}`
          } :
          { name: 'Me', email: account.email }
        
        mockEmails.push({
          id: `${account.id}-email-${i}`,
          subject: `Email from ${account.name} account - ${i + 1}`,
          from: fromPerson,
          to: [toPerson],
          body: this.generateRandomEmailBody(account.name),
          date,
          read: isRead,
          folder,
          attachments: Math.random() > 0.7 ? [
            {
              name: 'document.pdf',
              size: 1024 * 1024 * (1 + Math.random() * 10), // 1-10MB
              url: '#'
            }
          ] : undefined,
          accountId: account.id
        })
      }
      
      return mockEmails
    },
    
    generateMockEmails() {
      // This is a fallback method for when no accounts are connected
      // It produces generic mock emails similar to what was in the original mail page
      const mockEmails: Email[] = []
      const numEmails = 20
      
      for (let i = 0; i < numEmails; i++) {
        const isRead = Math.random() > 0.3
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(Math.random() * 14)) // Random date within last 2 weeks
        
        const folder = Math.random() > 0.8 ? 
          (Math.random() > 0.5 ? 'sent' : 'drafts') : 
          'inbox'
        
        // Random sender/recipient
        const fromPerson = folder === 'sent' ? 
          { name: 'Me', email: 'me@example.com' } :
          { name: `Contact ${i}`, email: `contact${i}@example.com` }
        
        const toPerson = folder === 'sent' ? 
          { name: `Contact ${i}`, email: `contact${i}@example.com` } :
          { name: 'Me', email: 'me@example.com' }
        
        mockEmails.push({
          id: `mock-email-${i}`,
          subject: `Sample email ${i + 1}`,
          from: fromPerson,
          to: [toPerson],
          body: this.generateRandomEmailBody(),
          date,
          read: isRead,
          folder,
          attachments: Math.random() > 0.7 ? [
            {
              name: 'document.pdf',
              size: 1024 * 1024 * (1 + Math.random() * 10), // 1-10MB
              url: '#'
            }
          ] : undefined
        })
      }
      
      this.emails = mockEmails
    },
    
    generateRandomEmailBody(accountName: string = ''): string {
      const templates = [
        `<p>Hello,</p><p>I wanted to follow up on our previous conversation about the project. We're making good progress, but there are a few things I'd like to discuss.</p><p>Could we schedule a meeting sometime this week?</p><p>Best regards,<br>${accountName ? 'Your contact from ' + accountName : 'John'}</p>`,
        
        `<p>Hi there,</p><p>I'm reaching out to share some updates on the ${Math.random() > 0.5 ? 'marketing' : 'development'} initiative we discussed. The team has been working hard, and we've made significant progress.</p><p>I've attached some documents for your review.</p><p>Looking forward to your feedback,<br>${accountName ? 'Team at ' + accountName : 'Sarah'}</p>`,
        
        `<p>Greetings,</p><p>Just a quick note to confirm our meeting on ${new Date(Date.now() + 86400000 * Math.floor(Math.random() * 7)).toLocaleDateString()} at ${Math.floor(Math.random() * 12) + 1}:${Math.random() > 0.5 ? '00' : '30'} ${Math.random() > 0.5 ? 'AM' : 'PM'}.</p><p>Please let me know if you need to reschedule.</p><p>Regards,<br>${accountName ? 'Your colleague at ' + accountName : 'Michael'}</p>`,
        
        `<p>Dear Team,</p><p>I'm pleased to announce that we've reached a major milestone in our project. The client has approved our proposal and we're ready to move forward with the next phase.</p><p>Thank you all for your hard work and dedication.</p><p>Sincerely,<br>${accountName ? 'Management at ' + accountName : 'Emily'}<br>Team Lead</p>`
      ]
      
      return templates[Math.floor(Math.random() * templates.length)]
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
    
    sendEmail(email: Email) {
      // In a real app, this would send the email through the account's API
      // For demo purposes, we'll just add it to the sent folder
      
      const newEmail: Email = {
        ...email,
        id: `email-${Date.now()}`,
        folder: 'sent',
        read: true,
        date: new Date()
      }
      
      this.emails.unshift(newEmail)
      
      return newEmail
    },
    
    saveDraft(email: Email) {
      // For demo purposes, we'll just add it to the drafts folder
      
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
  }
})
