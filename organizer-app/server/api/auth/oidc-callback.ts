import type { H3Event } from 'h3'
import { defineEventHandler, getQuery, getRequestURL, setResponseHeader } from 'h3'
import { $fetch } from 'ofetch'
import { MICROSOFT_GRAPH_INTEGRATION_SCOPES } from '~/config/microsoftIntegrationOAuth'

type OauthState = {
  provider?: string
  origin?: string
  timestamp?: number
  debug?: boolean
}

function parseOauthState (stateParam: string | undefined): OauthState {
  if (!stateParam) { return {} }
  try {
    return JSON.parse(decodeURIComponent(stateParam)) as OauthState
  } catch {
    return {}
  }
}

function resolveRedirectUri (event: H3Event): string {
  const url = getRequestURL(event)
  const origin = `${url.protocol}//${url.host}`
  return `${origin}/auth/callback`
}

/**
 * Server-side OIDC callback: exchange authorization code for tokens (Google or Microsoft).
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  console.log('[API] OIDC Callback received')

  try {
    const query = getQuery(event)
    console.log('[API] Received query parameters:', query)

    const code = query.code as string
    const stateRaw = query.state as string | undefined
    const error = query.error as string
    const errorDescription = query.error_description as string

    if (error) {
      console.error('[API] OAuth error:', error, errorDescription)
      return {
        success: false,
        error: `OAuth error: ${error}`,
        errorDescription
      }
    }

    if (!code) {
      console.error('[API] No authorization code provided in query:', query)
      return {
        success: false,
        error: 'No authorization code provided in callback URL'
      }
    }

    const state = parseOauthState(stateRaw)
    const provider = state.provider === 'microsoft' ? 'microsoft' : 'google'
    const redirectUri = resolveRedirectUri(event)
    console.log(`[API] Provider: ${provider}, redirect URI: ${redirectUri}`)

    if (provider === 'microsoft') {
      const clientId = process.env.MICROSOFT_CLIENT_ID
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'

      if (!clientId || !clientSecret) {
        console.error('[API] Missing Microsoft OAuth credentials', {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        })
        return {
          success: false,
          error: 'Missing Microsoft OAuth credentials on server'
        }
      }

      const tokenUrl = `https://login.microsoftonline.com/${tenantId.trim()}/oauth2/v2.0/token`
      const formData = new URLSearchParams()
      formData.append('client_id', clientId)
      formData.append('client_secret', clientSecret)
      formData.append('code', code)
      formData.append('redirect_uri', redirectUri)
      formData.append('grant_type', 'authorization_code')
      formData.append('scope', MICROSOFT_GRAPH_INTEGRATION_SCOPES)

      try {
        console.log('[API] Sending token exchange request to Microsoft')
        const tokenResponse = await $fetch<Record<string, unknown>>(tokenUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

        console.log(
          '[API] Microsoft token response: access token length:',
          tokenResponse.access_token ? String(tokenResponse.access_token).length : 'none',
          'refresh token present:',
          !!tokenResponse.refresh_token
        )

        return {
          success: true,
          provider: 'microsoft',
          tokens: tokenResponse,
          clientInfo: {
            clientId,
            hasClientSecret: !!clientSecret
          }
        }
      } catch (fetchError: unknown) {
        const err = fetchError as { response?: { data?: unknown; status?: number }; message?: string }
        console.error('[API] Microsoft token exchange failed:', err.response?.data || err.message, err)

        return {
          success: false,
          error: 'Token exchange failed',
          errorDetails: {
            message: err.message,
            data: err.response?.data,
            status: err.response?.status
          }
        }
      }
    }

    // Google (default)
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('[API] Missing Google OAuth credentials', { hasClientId: !!clientId, hasClientSecret: !!clientSecret })
      return {
        success: false,
        error: 'Missing OAuth credentials on server'
      }
    }

    console.log('[API] Found Google client credentials, proceeding with token exchange')

    const formData = new URLSearchParams()
    formData.append('code', code)
    formData.append('client_id', clientId)
    formData.append('client_secret', clientSecret)
    formData.append('redirect_uri', redirectUri)
    formData.append('grant_type', 'authorization_code')

    console.log(
      `[API] Google token exchange: code=${code.substring(0, 5)}..., client_id=${clientId}, redirect_uri=${redirectUri}`
    )

    try {
      console.log('[API] Sending token exchange request to Google')
      const tokenResponse = await $fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      console.log(
        '[API] Received token response, access token length:',
        tokenResponse.access_token ? String(tokenResponse.access_token).length : 'none',
        'refresh token present:',
        !!tokenResponse.refresh_token,
        'id token present:',
        !!tokenResponse.id_token
      )

      return {
        success: true,
        provider: 'google',
        tokens: tokenResponse,
        clientInfo: {
          clientId,
          hasClientSecret: !!clientSecret
        }
      }
    } catch (fetchError: unknown) {
      const err = fetchError as { response?: { data?: unknown }; message?: string; stack?: string }
      console.error('[API] Error exchanging code for tokens:', err.response?.data || err.message, err.stack)

      return {
        success: false,
        error: 'Token exchange failed',
        errorDetails: {
          message:
            (err.response?.data as { error_description?: string })?.error_description ||
            (err.response?.data as { error?: string })?.error ||
            err.message,
          data: err.response?.data
        }
      }
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string; stack?: string }
    console.error('[API] Error processing OIDC callback:', err.response?.data || err.message, err.stack)

    return {
      success: false,
      error: 'OIDC callback processing failed',
      errorMessage:
        (err.response?.data as { error_description?: string })?.error_description ||
        (err.response?.data as { error?: string })?.error ||
        err.message,
      details: err.response?.data
    }
  }
})
