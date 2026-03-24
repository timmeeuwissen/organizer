/**
 * Exchange a Microsoft OAuth refresh token for new access tokens.
 * Kept separate from the HTTP handler for unit testing (mock fetch).
 */

export type MicrosoftTokenSuccess = {
  access_token: string
  expires_in: number
  scope?: string
  token_type: string
  refresh_token?: string
}

export type MicrosoftTokenFailure = {
  httpStatus: number
  error: string
  error_description?: string
  details?: unknown
}

function tokenEndpoint(tenantId: string): string {
  const tenant = tenantId.trim() || 'common'
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`
}

export async function exchangeMicrosoftRefreshToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<{ ok: true; tokens: MicrosoftTokenSuccess } | { ok: false; failure: MicrosoftTokenFailure }> {
  const response = await fetch(tokenEndpoint(tenantId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  let data: Record<string, unknown> = {}
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    try {
      data = (await response.json()) as Record<string, unknown>
    } catch {
      data = {}
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      failure: {
        httpStatus: response.status,
        error: typeof data.error === 'string' ? data.error : 'oauth_error',
        error_description: typeof data.error_description === 'string' ? data.error_description : undefined,
        details: data,
      },
    }
  }

  if (typeof data.access_token !== 'string' || !data.access_token) {
    return {
      ok: false,
      failure: {
        httpStatus: 502,
        error: 'invalid_response',
        error_description: 'Missing access_token in Microsoft token response',
        details: data,
      },
    }
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600
  const tokenType = typeof data.token_type === 'string' ? data.token_type : 'Bearer'

  return {
    ok: true,
    tokens: {
      access_token: data.access_token,
      expires_in: expiresIn,
      scope: typeof data.scope === 'string' ? data.scope : undefined,
      token_type: tokenType,
      refresh_token: typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
    },
  }
}
