import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { googleIntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'
import {
  buildAuthHeaders,
  makeApiRequest,
  ApiError
} from '~/utils/api/core/apiUtils'

describe('apiUtils', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('buildAuthHeaders throws without access token', () => {
    const acc = googleIntegrationAccount({
      oauthData: {
        ...googleIntegrationAccount().oauthData,
        accessToken: undefined
      }
    })
    expect(() => buildAuthHeaders(acc)).toThrow(/No access token/)
  })

  it('buildAuthHeaders returns Bearer and JSON headers', () => {
    const acc = googleIntegrationAccount()
    const h = buildAuthHeaders(acc)
    expect(h.Authorization).toBe('Bearer test-google-access-token')
    expect(h['Content-Type']).toBe('application/json')
    expect(h.Accept).toBe('application/json')
  })

  it('makeApiRequest returns parsed JSON on success', async () => {
    const acc = googleIntegrationAccount()
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true, id: 1 }))

    const data = await makeApiRequest('https://example.com/api', acc)
    expect(data).toEqual({ ok: true, id: 1 })
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-google-access-token'
        })
      })
    )
  })

  it('makeApiRequest appends query params', async () => {
    const acc = googleIntegrationAccount()
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}))
    await makeApiRequest('https://example.com/x', acc, {
      params: { a: '1', b: 'two' }
    })
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      'https://example.com/x?a=1&b=two'
    )
  })

  it('makeApiRequest throws ApiError on HTTP error', async () => {
    const acc = googleIntegrationAccount()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'nope' }, { ok: false, status: 401, statusText: 'Unauthorized' })
    )
    await expect(
      makeApiRequest('https://example.com/x', acc)
    ).rejects.toMatchObject({ name: 'ApiError', status: 401 })
  })
})
