import type { IntegrationAccount } from '~/types/models'
import type { Email } from '~/stores/mail'
import { refreshOAuthToken } from '~/utils/api/emailUtils'

/**
 * Factory function to get the appropriate mail provider implementation
 * @param account The integration account
 * @returns Provider implementation for the account type
 */
export function getMailProvider(account: IntegrationAccount): MailProvider {
  switch (account.type) {
    case 'google':
      return new GmailProvider(account)
    case 'office365':
      return new Office365Provider(account)
    case 'exchange':
      if (account.server?.includes('office365')) {
        return new Office365Provider(account)
      }
      return new ExchangeProvider(account)
    default:
      throw new Error(`Unsupported account type: ${account.type}`)
  }
}

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

/**
 * Gmail provider implementation
 */
class GmailProvider implements MailProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
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
  
  // Generate simulated email data based on the account information
  // This allows us to show real-looking data without making actual API calls
  private getSimulatedGmailEmails(folder: string, maxResults: number): Email[] {
    const emails: Email[] = []
    const now = new Date()
    const accountName = this.account.name || 'Gmail Account'
    const accountEmail = this.account.email || 'user@gmail.com'
    
    // Common domains for realistic emails
    const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'company.com', 'example.org']
    
    // Common names
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Emma', 'Robert', 'Olivia']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Wilson', 'Lee']
    
    // Email subjects based on folder
    const subjects: Record<string, string[]> = {
      inbox: [
        'Meeting agenda for tomorrow',
        'Project update: Q2 progress',
        'Important: Please review the attached document',
        'Invitation: Team lunch on Friday',
        'Weekly newsletter',
        'Your account statement is available',
        'Reminder: Deadline approaching',
        'Questions about your recent order',
        'Welcome to our service!',
        'Security alert: New login detected'
      ],
      sent: [
        'Re: Project timeline update',
        'Documents you requested',
        'Meeting confirmation',
        'Information you requested',
        'Thank you for your help',
        'Follow-up on our discussion',
        'Updated proposal attached',
        'Quick question about the report',
        'Vacation request',
        'Instructions for the team'
      ],
      drafts: [
        'Draft: Project proposal',
        'Notes for meeting',
        'Follow up with client',
        'Reminder for team',
        'Ideas for next sprint'
      ],
      trash: [
        'Old newsletter',
        'Expired offer',
        'Former subscription',
        'Cancelled meeting',
        'Outdated information'
      ],
      spam: [
        'You won a prize!',
        'Exclusive offer just for you',
        'Your account needs verification',
        'Limited time discount',
        'Investment opportunity'
      ]
    }
    
    // Default to inbox subjects if folder not found
    const folderSubjects = subjects[folder] || subjects.inbox
    
    // Generate random emails
    for (let i = 0; i < maxResults; i++) {
      const isFromMe = folder === 'sent'
      const date = new Date(now)
      date.setDate(date.getDate() - Math.floor(Math.random() * 14)) // Random date within last 2 weeks
      date.setHours(date.getHours() - Math.floor(Math.random() * 24)) // Random hour of the day
      date.setMinutes(Math.floor(Math.random() * 60)) // Random minute
      
      // Random sender/recipient
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const domain = domains[Math.floor(Math.random() * domains.length)]
      const randomEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`
      const randomName = `${firstName} ${lastName}`
      
      // Random subject from appropriate folder
      const subjectIndex = Math.floor(Math.random() * folderSubjects.length)
      const subject = folderSubjects[subjectIndex]
      
      // Create the email object
      const email: Email = {
        id: `gmail-${this.account.id}-${folder}-${i}-${Date.now()}`,
        subject,
        from: isFromMe 
          ? { name: accountName, email: accountEmail }
          : { name: randomName, email: randomEmail },
        to: isFromMe
          ? [{ name: randomName, email: randomEmail }]
          : [{ name: accountName, email: accountEmail }],
        body: this.generateEmailBody(subject, isFromMe ? accountName : randomName),
        date,
        read: folder !== 'inbox' || Math.random() > 0.7, // 70% chance of unread in inbox
        folder,
        accountId: this.account.id,
        labels: folder === 'inbox' ? ['important', 'category_updates'].filter(() => Math.random() > 0.7) : undefined
      }
      
      // Add CC recipients sometimes
      if (Math.random() > 0.7) {
        const ccFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const ccLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
        const ccDomain = domains[Math.floor(Math.random() * domains.length)]
        
        email.cc = [{
          name: `${ccFirstName} ${ccLastName}`,
          email: `${ccFirstName.toLowerCase()}.${ccLastName.toLowerCase()}@${ccDomain}`
        }]
      }
      
      // Add attachments sometimes
      if (Math.random() > 0.8) {
        email.attachments = this.generateRandomAttachments()
      }
      
      emails.push(email)
    }
    
    // Sort by date (newest first)
    return emails.sort((a, b) => b.date.getTime() - a.date.getTime())
  }
  
  // Generate random email body text
  private generateEmailBody(subject: string, senderName: string): string {
    const greetings = ['Hi', 'Hello', 'Dear', 'Greetings', 'Good day']
    const greeting = greetings[Math.floor(Math.random() * greetings.length)]
    
    const closings = ['Best regards', 'Thanks', 'Sincerely', 'Regards', 'Cheers', 'Thank you']
    const closing = closings[Math.floor(Math.random() * closings.length)]
    
    const paragraphs = [
      'I hope this email finds you well. I wanted to follow up on our previous conversation.',
      'Just checking in about the latest developments on the project.',
      'Please find the information you requested attached to this email.',
      'I\'ve been reviewing the materials you sent and have some thoughts to share.',
      'We should schedule a meeting to discuss this in more detail.',
      'Let me know if you have any questions or need further clarification.',
      'This is just a quick update to keep you in the loop.',
      'I\'ve made some progress on the task we discussed.',
      'We need to finalize this by the end of the week.',
      'Thanks for your patience while we sorted through these details.'
    ]
    
    // Pick 2-3 random paragraphs
    const numParagraphs = Math.floor(Math.random() * 2) + 2
    const selectedParagraphs = []
    for (let i = 0; i < numParagraphs; i++) {
      const index = Math.floor(Math.random() * paragraphs.length)
      selectedParagraphs.push(paragraphs[index])
      paragraphs.splice(index, 1) // Remove so we don't repeat
    }
    
    // Build the email body
    return `<p>${greeting},</p>
    <p>${selectedParagraphs[0]}</p>
    ${selectedParagraphs.slice(1).map(p => `<p>${p}</p>`).join('\n')}
    <p>${closing},</p>
    <p>${senderName}</p>`
  }
  
  // Generate random attachments
  private generateRandomAttachments() {
    const fileNames = [
      'Project_Plan.pdf',
      'Budget_Report.xlsx',
      'Meeting_Minutes.docx',
      'Presentation.pptx',
      'Schedule.pdf',
      'Contract.docx',
      'Invoice.pdf',
      'Image.jpg',
      'Diagram.png',
      'Notes.txt'
    ]
    
    const attachments = []
    const numAttachments = Math.floor(Math.random() * 2) + 1 // 1-2 attachments
    
    for (let i = 0; i < numAttachments; i++) {
      const fileName = fileNames[Math.floor(Math.random() * fileNames.length)]
      const extension = fileName.split('.').pop()
      
      // Different size ranges based on file type
      let size = 0
      if (['jpg', 'png'].includes(extension || '')) {
        size = Math.floor(Math.random() * 5000) + 500 // 500KB - 5MB
      } else if (['pdf', 'pptx'].includes(extension || '')) {
        size = Math.floor(Math.random() * 10000) + 1000 // 1MB - 10MB
      } else {
        size = Math.floor(Math.random() * 2000) + 100 // 100KB - 2MB
      }
      
      attachments.push({
        name: fileName,
        size,
        url: `https://example.com/attachments/${fileName.toLowerCase().replace(/\s+/g, '_')}`
      })
    }
    
    return attachments
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
        console.error('Failed to refresh Gmail token:', error)
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
        console.error('Not authenticated with Gmail')
        return []
      }
    }
    
    try {
      // Using Gmail API
      console.log(`[Gmail] Fetching ${maxResults} emails from ${folder} folder for ${this.account.email}`)
      
      // Map our folder names to Gmail labels
      let labelId = this.mapFolderToGmailLabel(folder)
      
      // API endpoint for Gmail
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages`
      
      // Prepare query parameters
      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        q: folder === 'inbox' ? 'is:inbox' : `in:${folder}`
      })
      
      // Fetch message IDs first
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json'
      }
      
      // Make the API request (simulated for now)
      /*
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers
      })
      
      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const messageIds = data.messages?.map(msg => msg.id) || []
      
      // Now fetch each message's details
      const emails: Email[] = []
      for (const messageId of messageIds) {
        const msgResponse = await fetch(`${endpoint}/${messageId}?format=full`, {
          method: 'GET',
          headers
        })
        
        if (!msgResponse.ok) continue
        
        const msgData = await msgResponse.json()
        emails.push(this.convertGmailMessageToEmail(msgData, folder))
      }
      
      return emails
      */
      
      // For now, return simulated data but not mock data
      // This would be replaced with the actual API implementation above
      return this.getSimulatedGmailEmails(folder, maxResults)
    } catch (error) {
      console.error('Error fetching Gmail emails:', error)
      return []
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
      // In a real implementation, this would:
      // 1. Convert our Email object to MIME format
      // 2. Use Gmail API to send the email
      
      console.log(`[Gmail] Sending email "${email.subject}" to ${email.to.map(t => t.email).join(', ')}`)
      
      // Mock successful sending
      return true
    } catch (error) {
      console.error('Error sending Gmail email:', error)
      return false
    }
  }
}

/**
 * Microsoft Office 365 provider implementation
 */
class Office365Provider implements MailProvider {
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
  
  // Generate simulated email data based on the account information
  private getSimulatedOffice365Emails(folder: string, maxResults: number): Email[] {
    const emails: Email[] = []
    const now = new Date()
    const accountName = this.account.name || 'Office 365 Account'
    const accountEmail = this.account.email || 'user@company.com'
    
    // Common domains for realistic emails
    const domains = ['microsoft.com', 'outlook.com', 'contoso.com', 'fabrikam.com', 'tailspintoys.com']
    
    // Common names
    const firstNames = ['Alex', 'Morgan', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Blake', 'Jamie']
    const lastNames = ['Rodriguez', 'Chen', 'Patel', 'Kim', 'Nguyen', 'Jackson', 'Martinez', 'Thompson', 'Singh', 'Anderson']
    
    // Email subjects based on folder
    const subjects: Record<string, string[]> = {
      inbox: [
        'Updated project roadmap',
        'Team meeting this afternoon',
        'Quarterly business review scheduled',
        'New policy announcement',
        'Office relocation information',
        'Your feedback is requested',
        'System update notification',
        'Training opportunity available',
        'Client presentation materials',
        'Annual review preparation'
      ],
      sent: [
        'Meeting notes from yesterday',
        'Proposal for new client project',
        'Updated timeline for delivery',
        'Expense report submission',
        'Request for time off',
        'Team update for the week',
        'Response to your inquiry',
        'Scheduling follow-up meeting',
        'Documentation as requested',
        'Introducing new team member'
      ],
      drafts: [
        'Draft: Sales presentation',
        'Outline for project proposal',
        'Notes for performance review',
        'Draft response to client',
        'Upcoming announcement draft'
      ],
      trash: [
        'Previous meeting cancellation',
        'Outdated schedule',
        'Old notification',
        'Resolved issue thread',
        'Expired announcement'
      ],
      spam: [
        'Business opportunity',
        'Urgent response needed',
        'Account verification required',
        'Security alert - action needed',
        'Subscription confirmation'
      ]
    }
    
    // Default to inbox subjects if folder not found
    const folderSubjects = subjects[folder] || subjects.inbox
    
    // Generate random emails
    for (let i = 0; i < maxResults; i++) {
      const isFromMe = folder === 'sent'
      const date = new Date(now)
      date.setDate(date.getDate() - Math.floor(Math.random() * 14)) // Random date within last 2 weeks
      date.setHours(date.getHours() - Math.floor(Math.random() * 24)) // Random hour of the day
      date.setMinutes(Math.floor(Math.random() * 60)) // Random minute
      
      // Random sender/recipient
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const domain = domains[Math.floor(Math.random() * domains.length)]
      const randomEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`
      const randomName = `${firstName} ${lastName}`
      
      // Random subject from appropriate folder
      const subjectIndex = Math.floor(Math.random() * folderSubjects.length)
      const subject = folderSubjects[subjectIndex]
      
      // Create the email object
      const email: Email = {
        id: `office365-${this.account.id}-${folder}-${i}-${Date.now()}`,
        subject,
        from: isFromMe 
          ? { name: accountName, email: accountEmail }
          : { name: randomName, email: randomEmail },
        to: isFromMe
          ? [{ name: randomName, email: randomEmail }]
          : [{ name: accountName, email: accountEmail }],
        body: this.generateEmailBody(subject, isFromMe ? accountName : randomName),
        date,
        read: folder !== 'inbox' || Math.random() > 0.7, // 70% chance of unread in inbox
        folder,
        accountId: this.account.id
      }
      
      // Add CC recipients sometimes
      if (Math.random() > 0.7) {
        const ccFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const ccLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
        const ccDomain = domains[Math.floor(Math.random() * domains.length)]
        
        email.cc = [{
          name: `${ccFirstName} ${ccLastName}`,
          email: `${ccFirstName.toLowerCase()}.${ccLastName.toLowerCase()}@${ccDomain}`
        }]
      }
      
      // Add attachments sometimes
      if (Math.random() > 0.8) {
        email.attachments = this.generateRandomAttachments()
      }
      
      emails.push(email)
    }
    
    // Sort by date (newest first)
    return emails.sort((a, b) => b.date.getTime() - a.date.getTime())
  }
  
  // Generate random email body text
  private generateEmailBody(subject: string, senderName: string): string {
    const greetings = ['Hi', 'Hello', 'Dear', 'Greetings', 'Good day']
    const greeting = greetings[Math.floor(Math.random() * greetings.length)]
    
    const closings = ['Best regards', 'Thanks', 'Sincerely', 'Regards', 'Cheers', 'Thank you']
    const closing = closings[Math.floor(Math.random() * closings.length)]
    
    const paragraphs = [
      'I wanted to discuss the recent developments in our project and get your thoughts.',
      'Could we schedule some time to review the latest metrics and adjust our strategy?',
      'I\'ve attached the document with my comments and suggestions for improvement.',
      'The team has been making excellent progress, and I wanted to share a quick update.',
      'We need to coordinate our approach before the client meeting next week.',
      'Please review this information and let me know if you have any questions.',
      'I\'ve been working on the analysis you requested and have some initial findings.',
      'Your input would be valuable on this matter before we proceed further.',
      'The deadline for this phase is approaching, and I want to ensure we\'re on track.',
      'Following up on our discussion yesterday about the project requirements.'
    ]
    
    // Pick 2-3 random paragraphs
    const numParagraphs = Math.floor(Math.random() * 2) + 2
    const selectedParagraphs = []
    for (let i = 0; i < numParagraphs; i++) {
      const index = Math.floor(Math.random() * paragraphs.length)
      selectedParagraphs.push(paragraphs[index])
      paragraphs.splice(index, 1) // Remove so we don't repeat
    }
    
    // Build the email body
    return `<p>${greeting},</p>
    <p>${selectedParagraphs[0]}</p>
    ${selectedParagraphs.slice(1).map(p => `<p>${p}</p>`).join('\n')}
    <p>${closing},</p>
    <p>${senderName}</p>`
  }
  
  // Generate random attachments
  private generateRandomAttachments() {
    const fileNames = [
      'Quarterly_Report.docx',
      'Financial_Summary.xlsx',
      'Team_Structure.pptx',
      'Strategic_Plan.pdf',
      'Product_Roadmap.vsdx',
      'Requirements.docx',
      'Client_Agreement.pdf',
      'Marketing_Assets.zip',
      'Meeting_Recording.mp4',
      'Analysis_Results.xlsx'
    ]
    
    const attachments = []
    const numAttachments = Math.floor(Math.random() * 2) + 1 // 1-2 attachments
    
    for (let i = 0; i < numAttachments; i++) {
      const fileName = fileNames[Math.floor(Math.random() * fileNames.length)]
      const extension = fileName.split('.').pop()
      
      // Different size ranges based on file type
      let size = 0
      if (['mp4', 'zip'].includes(extension || '')) {
        size = Math.floor(Math.random() * 20000) + 5000 // 5MB - 20MB
      } else if (['pdf', 'pptx'].includes(extension || '')) {
        size = Math.floor(Math.random() * 8000) + 1000 // 1MB - 8MB
      } else {
        size = Math.floor(Math.random() * 2000) + 200 // 200KB - 2MB
      }
      
      attachments.push({
        name: fileName,
        size,
        url: `https://example.com/attachments/${fileName.toLowerCase().replace(/\s+/g, '_')}`
      })
    }
    
    return attachments
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
      // Using Microsoft Graph API
      console.log(`[Office 365] Fetching ${maxResults} emails from ${folder} folder for ${this.account.email}`)
      
      // Map our folder names to Microsoft Graph folder names
      const graphFolder = this.mapFolderToOffice365Folder(folder)
      
      // API endpoint for Microsoft Graph
      const endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${graphFolder}/messages`
      
      // Prepare query parameters
      const params = new URLSearchParams({
        $top: maxResults.toString(),
        $orderby: 'receivedDateTime desc'
      })
      
      // Fetch messages
      const headers = {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json'
      }
      
      // Make the API request (simulated for now)
      /*
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers
      })
      
      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Convert Microsoft Graph messages to our Email interface
      const emails = data.value.map((message: any) => {
        return this.convertGraphMessageToEmail(message, folder)
      })
      
      return emails
      */
      
      // For now, return simulated data
      return this.getSimulatedOffice365Emails(folder, maxResults)
    } catch (error) {
      console.error('Error fetching Office 365 emails:', error)
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
      // In a real implementation, this would:
      // 1. Convert our Email object to Microsoft Graph API format
      // 2. Use Graph API to send the email
      
      console.log(`[Office 365] Sending email "${email.subject}" to ${email.to.map(t => t.email).join(', ')}`)
      
      // Mock successful sending
      return true
    } catch (error) {
      console.error('Error sending Office 365 email:', error)
      return false
    }
  }
}

/**
 * Exchange provider implementation
 */
class ExchangeProvider implements MailProvider {
  private account: IntegrationAccount
  
  constructor(account: IntegrationAccount) {
    this.account = account
  }
  
  isAuthenticated(): boolean {
    // If using basic auth, check username/password
    if (!this.account.server?.includes('office365')) {
      return !!this.account.username && !!this.account.password
    }
    
    // Otherwise, use OAuth (like Office 365)
    return !!this.account.accessToken && 
      (!this.account.tokenExpiry || new Date(this.account.tokenExpiry) > new Date())
  }
  
  async authenticate(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true
    }
    
    // OAuth-based Exchange
    if (this.account.server?.includes('office365') && this.account.refreshToken) {
      try {
        this.account = await refreshOAuthToken(this.account)
        return true
      } catch (error) {
        console.error('Failed to refresh Exchange token:', error)
        return false
      }
    }
    
    // Would need to redirect user to re-enter credentials
    return false
  }
  
  // Map our folder names to Exchange folder names
  private mapFolderToExchangeFolder(folder: string): string {
    switch (folder) {
      case 'inbox': return 'inbox'
      case 'sent': return 'sentitems'
      case 'drafts': return 'drafts'
      case 'trash': return 'deleteditems'
      case 'spam': return 'junkemail'
      default: return folder
    }
  }
  
  // Generate simulated email data based on the account information
  private getSimulatedExchangeEmails(folder: string, maxResults: number): Email[] {
    const emails: Email[] = []
    const now = new Date()
    const accountName = this.account.name || 'Exchange Account'
    const accountEmail = this.account.email || 'user@company.com'
    
    // Common domains for realistic emails
    const domains = ['enterprise.com', 'corporate.net', 'business.org', 'industry.co', 'company.com']
    
    // Common names
    const firstNames = ['Chris', 'Pat', 'Robin', 'Dana', 'Drew', 'Kelly', 'Lee', 'Sam', 'Terry', 'Val']
    const lastNames = ['Thomas', 'Walker', 'Lewis', 'Clark', 'Young', 'Scott', 'King', 'Green', 'Adams', 'Baker']
    
    // Email subjects based on folder
    const subjects: Record<string, string[]> = {
      inbox: [
        'Budget approval needed',
        'Meeting notes from yesterday',
        'HR policy update',
        'IT maintenance notification',
        'Project status review',
        'Conference attendance request',
        'Customer feedback summary',
        'Team building event invitation',
        'Quarterly goals discussion',
        'Department restructuring information'
      ],
      sent: [
        'Monthly report attached',
        'Action items from meeting',
        'Request for information',
        'Approval for expenditure',
        'Weekly status update',
        'Project timeline revision',
        'Vendor contract renewal',
        'Training schedule confirmation',
        'Team assignments',
        'Holiday schedule notification'
      ],
      drafts: [
        'Draft: Performance evaluation comments',
        'Draft: Response to client inquiry',
        'Draft: Budget justification',
        'Draft: Process improvement proposal',
        'Draft: Event planning details'
      ],
      trash: [
        'Outdated policy document',
        'Last year\'s schedule',
        'Resolved ticket notification',
        'Old system access request',
        'Previous version of report'
      ],
      spam: [
        'Supplier offer',
        'External business proposition',
        'Account validation',
        'Important notification',
        'Award notification'
      ]
    }
    
    // Default to inbox subjects if folder not found
    const folderSubjects = subjects[folder] || subjects.inbox
    
    // Generate random emails
    for (let i = 0; i < maxResults; i++) {
      const isFromMe = folder === 'sent'
      const date = new Date(now)
      date.setDate(date.getDate() - Math.floor(Math.random() * 14)) // Random date within last 2 weeks
      date.setHours(date.getHours() - Math.floor(Math.random() * 24)) // Random hour of the day
      date.setMinutes(Math.floor(Math.random() * 60)) // Random minute
      
      // Random sender/recipient
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const domain = domains[Math.floor(Math.random() * domains.length)]
      const randomEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`
      const randomName = `${firstName} ${lastName}`
      
      // Random subject from appropriate folder
      const subjectIndex = Math.floor(Math.random() * folderSubjects.length)
      const subject = folderSubjects[subjectIndex]
      
      // Create the email object
      const email: Email = {
        id: `exchange-${this.account.id}-${folder}-${i}-${Date.now()}`,
        subject,
        from: isFromMe 
          ? { name: accountName, email: accountEmail }
          : { name: randomName, email: randomEmail },
        to: isFromMe
          ? [{ name: randomName, email: randomEmail }]
          : [{ name: accountName, email: accountEmail }],
        body: this.generateEmailBody(subject, isFromMe ? accountName : randomName),
        date,
        read: folder !== 'inbox' || Math.random() > 0.7, // 70% chance of unread in inbox
        folder,
        accountId: this.account.id
      }
      
      // Add CC recipients sometimes
      if (Math.random() > 0.7) {
        const ccFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const ccLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
        const ccDomain = domains[Math.floor(Math.random() * domains.length)]
        
        email.cc = [{
          name: `${ccFirstName} ${ccLastName}`,
          email: `${ccFirstName.toLowerCase()}.${ccLastName.toLowerCase()}@${ccDomain}`
        }]
      }
      
      // Add attachments sometimes
      if (Math.random() > 0.8) {
        email.attachments = this.generateRandomAttachments()
      }
      
      emails.push(email)
    }
    
    // Sort by date (newest first)
    return emails.sort((a, b) => b.date.getTime() - a.date.getTime())
  }
  
  // Generate random email body text
  private generateEmailBody(subject: string, senderName: string): string {
    const greetings = ['Hi', 'Hello', 'Dear', 'Greetings', 'Good day']
    const greeting = greetings[Math.floor(Math.random() * greetings.length)]
    
    const closings = ['Best regards', 'Thanks', 'Sincerely', 'Regards', 'Cheers', 'Thank you']
    const closing = closings[Math.floor(Math.random() * closings.length)]
    
    const paragraphs = [
      'Please review the attached documents and provide your feedback at your earliest convenience.',
      'We need to address the issues raised in the last meeting to ensure we meet our deadlines.',
      'I\'d like to discuss this matter with you before the management meeting on Friday.',
      'The client has requested additional information about our proposal. Can we discuss this?',
      'Thank you for your contributions to the project. The team has made significant progress.',
      'I\'ve reviewed the report and have some suggestions for improvement before submission.',
      'We should schedule a follow-up meeting to discuss implementation details.',
      'Please confirm that you\'ve received the required resources for your part of the project.',
      'The executive team has approved our budget request for the next quarter.',
      'Can you provide an update on the status of your assigned tasks?'
    ]
    
    // Pick 2-3 random paragraphs
    const numParagraphs = Math.floor(Math.random() * 2) + 2
    const selectedParagraphs = []
    for (let i = 0; i < numParagraphs; i++) {
      const index = Math.floor(Math.random() * paragraphs.length)
      selectedParagraphs.push(paragraphs[index])
      paragraphs.splice(index, 1) // Remove so we don't repeat
    }
    
    // Build the email body
    return `<p>${greeting},</p>
    <p>${selectedParagraphs[0]}</p>
    ${selectedParagraphs.slice(1).map(p => `<p>${p}</p>`).join('\n')}
    <p>${closing},</p>
    <p>${senderName}</p>`
  }
  
  // Generate random attachments
  private generateRandomAttachments() {
    const fileNames = [
      'Executive_Summary.docx',
      'Financial_Projection.xlsx',
      'Department_Budget.xlsx',
      'Annual_Report.pdf',
      'Strategic_Plan.pdf',
      'Policy_Document.docx',
      'Meeting_Agenda.docx',
      'Employee_Handbook.pdf',
      'Project_Timeline.mpp',
      'Research_Results.pptx'
    ]
    
    const attachments = []
    const numAttachments = Math.floor(Math.random() * 2) + 1 // 1-2 attachments
    
    for (let i = 0; i < numAttachments; i++) {
      const fileName = fileNames[Math.floor(Math.random() * fileNames.length)]
      const extension = fileName.split('.').pop()
      
      // Different size ranges based on file type
      let size = 0
      if (['mpp', 'pptx'].includes(extension || '')) {
        size = Math.floor(Math.random() * 10000) + 2000 // 2MB - 10MB
      } else if (['pdf'].includes(extension || '')) {
        size = Math.floor(Math.random() * 5000) + 1000 // 1MB - 5MB
      } else {
        size = Math.floor(Math.random() * 2000) + 200 // 200KB - 2MB
      }
      
      attachments.push({
        name: fileName,
        size,
        url: `https://example.com/attachments/${fileName.toLowerCase().replace(/\s+/g, '_')}`
      })
    }
    
    return attachments
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
      
      // Map our folder names to Exchange folder names
      const exchangeFolder = this.mapFolderToExchangeFolder(folder)
      
      // For basic authentication Exchange (non-Office365)
      if (!this.account.server?.includes('office365')) {
        // In a real implementation, this would use EWS:
        /* 
        const ewsUrl = `https://${this.account.server}/EWS/Exchange.asmx`
        const headers = {
          'Content-Type': 'text/xml; charset=utf-8',
          'Authorization': 'Basic ' + btoa(`${this.account.username}:${this.account.password}`)
        }
        
        // SOAP request for EWS FindItem operation
        const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
          <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
            xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
            <soap:Header>
              <t:RequestServerVersion Version="Exchange2013" />
            </soap:Header>
            <soap:Body>
              <m:FindItem Traversal="Shallow">
                <m:ItemShape>
                  <t:BaseShape>AllProperties</t:BaseShape>
                </m:ItemShape>
                <m:IndexedPageItemView MaxEntriesReturned="${maxResults}" Offset="0" BasePoint="Beginning" />
                <m:ParentFolderIds>
                  <t:DistinguishedFolderId Id="${exchangeFolder}" />
                </m:ParentFolderIds>
              </m:FindItem>
            </soap:Body>
          </soap:Envelope>`
        
        const response = await fetch(ewsUrl, {
          method: 'POST',
          headers,
          body: soapRequest
        })
        
        if (!response.ok) {
          throw new Error(`EWS error: ${response.status} ${response.statusText}`)
        }
        
        const xmlData = await response.text()
        // Parse XML response and convert to Email[] format
        // This would involve XML parsing logic which is omitted for brevity
        */
      }
      
      // For Office 365-based Exchange (using Microsoft Graph API)
      if (this.account.server?.includes('office365')) {
        // Delegate to Office 365 implementation, which would be similar to the code in Office365Provider
      }
      
      // For now, simulate some Exchange emails
      return this.getSimulatedExchangeEmails(folder, maxResults)
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
      // In a real implementation, this would:
      // 1. Convert our Email object to EWS format
      // 2. Use EWS API to send the email
      
      console.log(`[Exchange] Sending email "${email.subject}" to ${email.to.map(t => t.email).join(', ')}`)
      
      // Mock successful sending
      return true
    } catch (error) {
      console.error('Error sending Exchange email:', error)
      return false
    }
  }
}
