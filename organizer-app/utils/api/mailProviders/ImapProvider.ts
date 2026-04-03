import type { Email } from '~/stores/mail'
import { BaseMailProvider } from './BaseMailProvider'
import type { EmailQuery, EmailPagination, EmailFetchResult } from './MailProvider'

/**
 * IMAP mail provider — communicates with server-side Nitro routes
 * that connect to the IMAP/SMTP server using imapflow and nodemailer.
 */
export class ImapProvider extends BaseMailProvider {
  constructor(account: any) {
    super(account)
  }

  private get creds() {
    const o = this.account.oauthData
    return {
      host: o.host as string,
      port: o.port as number,
      encryption: (o.encryption ?? 'tls') as 'none' | 'tls' | 'starttls',
      username: o.username as string,
      password: o.password as string,
    }
  }

  isAuthenticated(): boolean {
    const o = this.account.oauthData
    return !!(o?.host && o?.username && o?.password && o?.connected)
  }

  async authenticate(): Promise<boolean> {
    try {
      const res = await fetch('/api/mail/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: 'imap', ...this.creds }),
      })
      const data = await res.json()
      if (data.success) {
        this.account.oauthData.connected = true
      }
      return !!data.success
    } catch (err) {
      console.error('IMAP authentication failed:', err)
      return false
    }
  }

  async fetchEmails(query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult> {
    try {
      const res = await fetch('/api/mail/imap/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...this.creds,
          folder: query?.folder ?? 'INBOX',
          page: pagination?.page ?? 0,
          pageSize: pagination?.pageSize ?? 50,
        }),
      })

      if (!res.ok) throw new Error(`IMAP fetch error: ${res.statusText}`)

      const data = await res.json()
      return {
        emails: (data.emails ?? []).map((e: any) => ({
          ...e,
          accountId: this.account.id,
          date: new Date(e.date),
        })),
        totalCount: data.totalCount ?? 0,
        page: data.page ?? 0,
        pageSize: data.pageSize ?? 50,
        hasMore: data.hasMore ?? false,
      }
    } catch (err) {
      console.error('ImapProvider.fetchEmails failed:', err)
      return { emails: [], totalCount: 0, page: 0, pageSize: 50, hasMore: false }
    }
  }

  async countEmails(query?: EmailQuery): Promise<number> {
    try {
      const folders = await this.getFolderCounts()
      const folder = query?.folder ?? 'INBOX'
      return folders[folder] ?? 0
    } catch {
      return 0
    }
  }

  async getFolderCounts(): Promise<Record<string, number>> {
    try {
      const res = await fetch('/api/mail/imap/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.creds),
      })
      if (!res.ok) throw new Error(`IMAP folders error: ${res.statusText}`)
      const data = await res.json()
      return data.folders ?? {}
    } catch (err) {
      console.error('ImapProvider.getFolderCounts failed:', err)
      return {}
    }
  }

  async sendEmail(email: Email): Promise<boolean> {
    const o = this.account.oauthData
    if (!o?.smtpHost) {
      console.error('ImapProvider: no SMTP host configured for sending')
      return false
    }

    try {
      const res = await fetch('/api/mail/imap/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: o.smtpHost,
          smtpPort: o.smtpPort ?? 587,
          smtpEncryption: o.smtpEncryption ?? 'starttls',
          username: o.username,
          password: o.password,
          email,
        }),
      })
      if (!res.ok) throw new Error(`SMTP send error: ${res.statusText}`)
      const data = await res.json()
      return !!data.success
    } catch (err) {
      console.error('ImapProvider.sendEmail failed:', err)
      return false
    }
  }
}
