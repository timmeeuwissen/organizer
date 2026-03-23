import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GoogleContactsProvider } from '~/utils/api/contactProviders/GoogleContactsProvider'
import { googleIntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'

describe('GoogleContactsProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function contactsAccount() {
    return googleIntegrationAccount({
      oauthData: {
        ...googleIntegrationAccount().oauthData,
        scope: 'https://www.googleapis.com/auth/contacts.readonly',
      },
    })
  }

  it('fetchContacts maps People API connections to Person', async () => {
    const acc = contactsAccount()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        connections: [
          {
            names: [{ givenName: 'Jane', familyName: 'Doe' }],
            emailAddresses: [{ value: 'jane@example.com' }],
          },
        ],
        totalItems: 1,
      })
    )

    const p = new GoogleContactsProvider(acc)
    const res = await p.fetchContacts(undefined, { page: 0, pageSize: 50 })

    expect(res.contacts).toHaveLength(1)
    expect(res.contacts[0].firstName).toBe('Jane')
    expect(res.contacts[0].lastName).toBe('Doe')
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('people.googleapis.com/v1/people/me/connections')
  })

  it('fetchContacts throws on API error', async () => {
    const acc = contactsAccount()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, { ok: false, status: 403, statusText: 'Forbidden' })
    )
    const p = new GoogleContactsProvider(acc)
    await expect(p.fetchContacts()).rejects.toThrow(/Failed to fetch contacts/)
  })
})
