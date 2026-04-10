import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { jsonResponse } from '../../../helpers/mockFetch'
import { Pop3Provider } from '~/utils/api/mailProviders/Pop3Provider'

function makeAccount (overrides: Record<string, any> = {}) {
  return {
    id: 'acc-pop3-1',
    type: 'pop3',
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
      name: 'Test POP3',
      host: 'pop.example.com',
      port: 995,
      encryption: 'tls',
      username: 'user@example.com',
      password: 'secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpEncryption: 'starttls',
      ...overrides.oauthData
    },
    ...overrides
  }
}

describe('Pop3Provider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchEmails calls /api/mail/pop3/fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        emails: [
          {
            id: 'pop3-1',
            subject: 'POP3 message',
            from: { name: '', email: '' },
            to: [],
            date: new Date().toISOString(),
            read: false,
            folder: 'inbox',
            body: '',
            attachments: []
          }
        ],
        totalCount: 1,
        page: 0,
        pageSize: 50,
        hasMore: false
      })
    )

    const p = new Pop3Provider(makeAccount())
    const result = await p.fetchEmails()

    expect(result.emails).toHaveLength(1)
    expect(result.emails[0].subject).toBe('POP3 message')
  })

  it('getFolderCounts returns only inbox', async () => {
    // getFolderCounts calls countEmails which calls fetchEmails
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ emails: [], totalCount: 3, page: 0, pageSize: 50, hasMore: false })
    )

    const p = new Pop3Provider(makeAccount())
    const counts = await p.getFolderCounts()

    expect(Object.keys(counts)).toEqual(['inbox'])
  })

  it('isAuthenticated returns false when password is missing', () => {
    const p = new Pop3Provider(makeAccount({ oauthData: { password: undefined } }))
    expect(p.isAuthenticated()).toBe(false)
  })
})
