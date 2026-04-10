import { BaseMailProvider } from './BaseMailProvider'
import type { EmailQuery, EmailPagination, EmailFetchResult } from './MailProvider'
import type { Email } from '~/stores/mail'

/**
 * POP3 mail provider — communicates with server-side Nitro routes.
 * POP3 is receive-only (inbox) + SMTP for sending.
 */
export class Pop3Provider extends BaseMailProvider {
  private get creds () {
    const o = this.account.oauthData
    return {
      host: o.host as string,
      port: o.port as number,
      encryption: (o.encryption ?? 'tls') as 'none' | 'tls' | 'starttls',
      username: o.username as string,
      password: o.password as string
    }
  }

  isAuthenticated (): boolean {
    const o = this.account.oauthData
    return !!(o?.host && o?.username && o?.password && o?.connected)
  }

  async authenticate (): Promise<boolean> {
    try {
      const res = await fetch('/api/mail/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: 'pop3', ...this.creds })
      })
      const data = await res.json()
      if (data.success) {
        this.account.oauthData.connected = true
      }
      return !!data.success
    } catch (err) {
      console.error('POP3 authentication failed:', err)
      return false
    }
  }

  async fetchEmails (query?: EmailQuery, pagination?: EmailPagination): Promise<EmailFetchResult> {
    try {
      const res = await fetch('/api/mail/pop3/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...this.creds,
          page: pagination?.page ?? 0,
          pageSize: pagination?.pageSize ?? 50
        })
      })

      if (!res.ok) { throw new Error(`POP3 fetch error: ${res.statusText}`) }

      const data = await res.json()
      return {
        emails: (data.emails ?? []).map((e: any) => ({
          ...e,
          accountId: this.account.id,
          date: new Date(e.date)
        })),
        totalCount: data.totalCount ?? 0,
        page: data.page ?? 0,
        pageSize: data.pageSize ?? 50,
        hasMore: false // POP3 doesn't support server-side pagination
      }
    } catch (err) {
      console.error('Pop3Provider.fetchEmails failed:', err)
      return { emails: [], totalCount: 0, page: 0, pageSize: 50, hasMore: false }
    }
  }

  async countEmails (query?: EmailQuery): Promise<number> {
    const result = await this.fetchEmails()
    return result.totalCount
  }

  /** POP3 has no folder concept — returns inbox count only */
  async getFolderCounts (): Promise<Record<string, number>> {
    const count = await this.countEmails()
    return { inbox: count }
  }

  async sendEmail (email: Email): Promise<boolean> {
    const o = this.account.oauthData
    if (!o?.smtpHost) {
      console.error('Pop3Provider: no SMTP host configured for sending')
      return false
    }

    try {
      const res = await fetch('/api/mail/pop3/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: o.smtpHost,
          smtpPort: o.smtpPort ?? 587,
          smtpEncryption: o.smtpEncryption ?? 'starttls',
          username: o.username,
          password: o.password,
          email
        })
      })
      if (!res.ok) { throw new Error(`SMTP send error: ${res.statusText}`) }
      const data = await res.json()
      return !!data.success
    } catch (err) {
      console.error('Pop3Provider.sendEmail failed:', err)
      return false
    }
  }
}
