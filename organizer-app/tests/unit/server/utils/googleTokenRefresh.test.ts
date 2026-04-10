import { describe, expect, it, vi, afterEach } from 'vitest'
import { exchangeGoogleRefreshToken } from '~/server/utils/oauth/googleTokenRefresh'

describe('exchangeGoogleRefreshToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns tokens when Google responds with access_token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          access_token: 'new-access',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'email'
        })
      })
    )

    const result = await exchangeGoogleRefreshToken('rt', 'cid', 'csec')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.tokens.access_token).toBe('new-access')
      expect(result.tokens.expires_in).toBe(3600)
      expect(result.tokens.token_type).toBe('Bearer')
    }
  })

  it('returns invalid_grant failure when Google rejects the refresh token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Bad Request'
        })
      })
    )

    const result = await exchangeGoogleRefreshToken('rt', 'cid', 'csec')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error).toBe('invalid_grant')
      expect(result.failure.httpStatus).toBe(400)
    }
  })

  it('returns invalid_response when Google returns 200 without access_token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({})
      })
    )

    const result = await exchangeGoogleRefreshToken('rt', 'cid', 'csec')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error).toBe('invalid_response')
      expect(result.failure.httpStatus).toBe(502)
    }
  })
})
