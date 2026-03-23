import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Office365Provider } from '~/utils/api/mailProviders/Office365Provider'
import { office365IntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'

describe('Office365Provider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('countEmails parses numeric JSON from Graph $count', async () => {
    const acc = office365IntegrationAccount()
    vi.mocked(fetch).mockResolvedValue(jsonResponse(7))

    const p = new Office365Provider(acc)
    const n = await p.countEmails({ folder: 'inbox' })
    expect(n).toBe(7)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/$count')
    const opts = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(opts.headers).toMatchObject(
      expect.objectContaining({
        Authorization: 'Bearer test-ms-access-token',
        ConsistencyLevel: 'eventual',
      })
    )
  })

  it('fetchEmails maps Graph messages to Email shape', async () => {
    const acc = office365IntegrationAccount()
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(1))
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: 'm1',
              subject: 'Hello',
              from: {
                emailAddress: { name: 'A', address: 'a@b.com' },
              },
              toRecipients: [],
              receivedDateTime: '2024-01-02T12:00:00Z',
              bodyPreview: 'preview',
              isRead: true,
            },
          ],
        })
      )

    const p = new Office365Provider(acc)
    const res = await p.fetchEmails(
      { folder: 'inbox' },
      { page: 0, pageSize: 20 }
    )
    expect(res.emails).toHaveLength(1)
    expect(res.emails[0].subject).toBe('Hello')
    expect(res.emails[0].from.email).toBe('a@b.com')
    expect(res.totalCount).toBe(1)
  })

  it('fetchEmails returns empty result on HTTP error', async () => {
    const acc = office365IntegrationAccount()
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(jsonResponse({}, { ok: false, status: 403, statusText: 'Forbidden' }))
    )
    const p = new Office365Provider(acc)
    const res = await p.fetchEmails({}, { page: 0, pageSize: 10 })
    expect(res.emails).toEqual([])
    expect(res.totalCount).toBe(0)
  })
})
