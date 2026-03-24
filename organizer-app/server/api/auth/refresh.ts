import {
  defineEventHandler,
  readBody,
  setResponseHeader,
  setResponseStatus,
} from 'h3'
import { exchangeGoogleRefreshToken } from '~/server/utils/oauth/googleTokenRefresh'
import { exchangeMicrosoftRefreshToken } from '~/server/utils/oauth/microsoftTokenRefresh'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common'

/**
 * Server-side token refresh for OAuth providers.
 * Uses real HTTP status codes so clients can use response.ok and parse errors correctly.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  let body: { refreshToken?: string; provider?: string; email?: string }
  try {
    body = await readBody(event)
  } catch {
    setResponseStatus(event, 400)
    return { error: 'bad_request', error_description: 'Invalid JSON body' }
  }

  const { refreshToken, provider, email } = body

  if (!refreshToken) {
    setResponseStatus(event, 400)
    return { error: 'bad_request', error_description: 'Refresh token is required' }
  }

  try {
    if (provider === 'google') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google API credentials in environment variables')
        setResponseStatus(event, 500)
        return {
          error: 'server_configuration',
          error_description: 'Server is missing Google API credentials',
        }
      }

      console.log(`Refreshing Google OAuth token for ${email ?? '(no email)'}`)

      const result = await exchangeGoogleRefreshToken(
        refreshToken,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      )

      if (!result.ok) {
        const { failure } = result
        console.error('Google refresh token error:', failure)

        if (failure.error === 'invalid_grant') {
          setResponseStatus(event, 400)
          return {
            error: 'invalid_grant',
            error_description:
              failure.error_description ||
              'Refresh token is invalid or has expired. Re-authenticate your account.',
          }
        }

        setResponseStatus(event, failure.httpStatus >= 400 ? failure.httpStatus : 502)
        return {
          error: failure.error,
          error_description: failure.error_description,
          details: failure.details,
        }
      }

      return result.tokens
    }

    if (provider === 'microsoft') {
      if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
        console.error('Missing Microsoft API credentials in environment variables')
        setResponseStatus(event, 500)
        return {
          error: 'server_configuration',
          error_description: 'Server is missing Microsoft OAuth credentials',
        }
      }

      console.log(`Refreshing Microsoft OAuth token for ${email ?? '(no email)'}`)

      const result = await exchangeMicrosoftRefreshToken(
        refreshToken,
        MICROSOFT_CLIENT_ID,
        MICROSOFT_CLIENT_SECRET,
        MICROSOFT_TENANT_ID
      )

      if (!result.ok) {
        const { failure } = result
        console.error('Microsoft refresh token error:', failure)

        if (failure.error === 'invalid_grant') {
          setResponseStatus(event, 400)
          return {
            error: 'invalid_grant',
            error_description:
              failure.error_description ||
              'Refresh token is invalid or has expired. Re-authenticate your account.',
          }
        }

        setResponseStatus(event, failure.httpStatus >= 400 ? failure.httpStatus : 502)
        return {
          error: failure.error,
          error_description: failure.error_description,
          details: failure.details,
        }
      }

      return result.tokens
    }

    setResponseStatus(event, 400)
    return {
      error: 'unsupported_provider',
      error_description: `Unsupported provider: ${provider ?? '(missing)'}`,
    }
  } catch (error) {
    console.error(`Error refreshing token for ${provider}:`, error)
    setResponseStatus(event, 500)
    return {
      error: 'internal_error',
      error_description: 'Internal server error during token refresh',
    }
  }
})
