import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exchangeMicrosoftRefreshToken } from '~/server/utils/oauth/microsoftTokenRefresh'

describe('exchangeMicrosoftRefreshToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns tokens when Microsoft responds with access_token', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'at',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'Mail.Read',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await exchangeMicrosoftRefreshToken('rt', 'cid', 'csec', 'common')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.tokens.access_token).toBe('at')
      expect(result.tokens.expires_in).toBe(3600)
    }

    expect(fetch).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns invalid_grant failure when Microsoft rejects the refresh token', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Refresh token expired',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await exchangeMicrosoftRefreshToken('rt', 'cid', 'csec', 'tenant-id')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error).toBe('invalid_grant')
    }

    expect(fetch).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
      expect.anything()
    )
  })

  it('returns invalid_response when Microsoft returns 200 without access_token', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const result = await exchangeMicrosoftRefreshToken('rt', 'cid', 'csec', 'common')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error).toBe('invalid_response')
    }
  })
})
