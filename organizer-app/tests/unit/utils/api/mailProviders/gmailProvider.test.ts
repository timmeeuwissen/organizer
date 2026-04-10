import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { googleIntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'
import { GmailProvider } from '~/utils/api/mailProviders/GmailProvider'

describe('GmailProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('countEmails returns resultSizeEstimate from Gmail API', async () => {
    const acc = googleIntegrationAccount({
      oauthData: {
        ...googleIntegrationAccount().oauthData,
        scope: 'https://www.googleapis.com/auth/gmail.readonly'
      }
    })
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ resultSizeEstimate: 12 })
    )

    const p = new GmailProvider(acc)
    const n = await p.countEmails({ folder: 'inbox' })
    expect(n).toBe(12)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('gmail.googleapis.com/gmail/v1/users/me/messages')
    expect(url).toContain('q=')
    expect(url).toContain('INBOX')
  })

  it('countEmails returns 0 when API throws', async () => {
    const acc = googleIntegrationAccount()
    vi.mocked(fetch).mockRejectedValue(new Error('network'))
    const p = new GmailProvider(acc)
    const n = await p.countEmails({ folder: 'inbox' })
    expect(n).toBe(0)
  })

  it('isAuthenticated is false without gmail scope when scope is set', () => {
    const acc = googleIntegrationAccount({
      oauthData: {
        ...googleIntegrationAccount().oauthData,
        scope: 'https://www.googleapis.com/auth/calendar.readonly'
      }
    })
    const p = new GmailProvider(acc)
    expect(p.isAuthenticated()).toBe(false)
  })
})
