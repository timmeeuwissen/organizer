import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImapProvider } from '~/utils/api/mailProviders/ImapProvider'
import { jsonResponse } from '../../../helpers/mockFetch'

function makeAccount(overrides: Record<string, any> = {}) {
  return {
    id: 'acc-imap-1',
    type: 'imap',
    color: '#607D8B',
    syncMail: true,
    showInMail: true,
    syncCalendar: false,
    syncTasks: false,
    syncContacts: false,
    showInCalendar: false,
    showInTasks: false,
    showInContacts: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    oauthData: {
      connected: true,
      email: 'user@example.com',
      name: 'Test IMAP',
      host: 'imap.example.com',
      port: 993,
      encryption: 'tls',
      username: 'user@example.com',
      password: 'secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpEncryption: 'starttls',
      ...overrides.oauthData,
    },
    ...overrides,
  }
}

describe('ImapProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isAuthenticated returns true when credentials and connected flag are present', () => {
    const p = new ImapProvider(makeAccount())
    expect(p.isAuthenticated()).toBe(true)
  })

  it('isAuthenticated returns false when host is missing', () => {
    const p = new ImapProvider(makeAccount({ oauthData: { host: undefined } }))
    expect(p.isAuthenticated()).toBe(false)
  })

  it('fetchEmails calls /api/mail/imap/fetch and returns emails', async () => {
    const mockEmails = [
      {
        id: 'msg-1',
        subject: 'Hello',
        from: { name: 'Alice', email: 'alice@example.com' },
        to: [],
        date: new Date().toISOString(),
        read: false,
        folder: 'INBOX',
        body: '',
        attachments: [],
      },
    ]
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ emails: mockEmails, totalCount: 1, page: 0, pageSize: 50, hasMore: false })
    )

    const p = new ImapProvider(makeAccount())
    const result = await p.fetchEmails()

    expect(result.emails).toHaveLength(1)
    expect(result.emails[0].subject).toBe('Hello')
    expect(result.totalCount).toBe(1)
  })

  it('getFolderCounts calls /api/mail/imap/folders', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ folders: { INBOX: 5, Sent: 10 } })
    )

    const p = new ImapProvider(makeAccount())
    const counts = await p.getFolderCounts()

    expect(counts.INBOX).toBe(5)
    expect(counts.Sent).toBe(10)
  })

  it('sendEmail returns false when smtpHost is not configured', async () => {
    const p = new ImapProvider(makeAccount({ oauthData: { smtpHost: undefined } }))
    const result = await p.sendEmail({
      id: '1',
      subject: 'Test',
      from: { name: 'Me', email: 'me@example.com' },
      to: [{ name: 'You', email: 'you@example.com' }],
      body: 'Hello',
      date: new Date(),
      read: false,
      folder: 'INBOX',
    })
    expect(result).toBe(false)
  })
})
