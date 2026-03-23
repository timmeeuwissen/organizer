import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Office365ContactsProvider } from '~/utils/api/contactProviders/Office365ContactsProvider'
import { office365IntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'

describe('Office365ContactsProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchContacts requests Graph me/contacts', async () => {
    const acc = office365IntegrationAccount()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        value: [
          {
            id: 'c1',
            givenName: 'Pat',
            surname: 'Lee',
            emailAddresses: [{ address: 'pat@example.com' }],
          },
        ],
      })
    )

    const p = new Office365ContactsProvider(acc)
    const res = await p.fetchContacts(undefined, { page: 0, pageSize: 50 })

    expect(res.contacts).toHaveLength(1)
    expect(res.contacts[0].firstName).toBe('Pat')
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('graph.microsoft.com/v1.0/me/contacts')
  })
})
