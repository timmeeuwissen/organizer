import { describe, it, expect } from 'vitest'
import { getAccountStatusColor } from '~/utils/api/emailUtils'

function makeAccount (overrides: Record<string, any> = {}) {
  return {
    id: 'acc-1',
    type: 'imap',
    color: '#1976D2',
    syncCalendar: false,
    syncMail: true,
    syncTasks: false,
    syncContacts: false,
    showInCalendar: false,
    showInMail: true,
    showInTasks: false,
    showInContacts: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    oauthData: {
      connected: true,
      email: 'imap@example.com',
      name: 'IMAP',
      host: 'imap.example.com',
      port: 993,
      encryption: 'tls',
      username: 'imap@example.com',
      password: 'secret'
    },
    ...overrides
  }
}

describe('emailUtils status color', () => {
  it('returns success for connected IMAP account', () => {
    const account = makeAccount()
    expect(getAccountStatusColor(account as any)).toBe('success')
  })

  it('returns success for connected POP3 account', () => {
    const account = makeAccount({ type: 'pop3' })
    expect(getAccountStatusColor(account as any)).toBe('success')
  })
})
