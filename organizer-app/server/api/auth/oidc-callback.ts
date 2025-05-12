import { defineEventHandler, getQuery } from 'h3'
import { $fetch } from 'ofetch'

/**
 * Server-side handler for OIDC callback processing
 * Handles the authorization code exchange for tokens
 */
export default defineEventHandler(async (event) => {
  console.log('[API] OIDC Callback received')
  
  try {
    // Get the code from the query parameters
    const query = getQuery(event)
    console.log('[API] Received query parameters:', query)
    
    const code = query.code as string
    const state = query.state as string
    const error = query.error as string
    const errorDescription = query.error_description as string
    
    // Check for OAuth errors in the query parameters
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
    
    // Get client credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('[API] Missing OAuth credentials', { hasClientId: !!clientId, hasClientSecret: !!clientSecret })
      return {
        success: false,
        error: 'Missing OAuth credentials on server'
      }
    }
    
    console.log('[API] Found client credentials, proceeding with token exchange')
    
    // Get the redirect URI that was used for the initial request
    // Extract origin from headers or use a default
    const origin = event.node.req.headers.origin || process.env.APP_URL || 'http://localhost:3000'
    const redirectUri = `${origin}/auth/callback`
    
    console.log(`[API] Using redirect URI: ${redirectUri}`)
    
    // Prepare form data for token exchange
    const formData = new URLSearchParams()
    formData.append('code', code)
    formData.append('client_id', clientId)
    formData.append('client_secret', clientSecret)
    formData.append('redirect_uri', redirectUri)
    formData.append('grant_type', 'authorization_code')
    
    // Log the request parameters (except client_secret for security)
    console.log(`[API] Token exchange parameters: code=${code.substring(0, 5)}..., client_id=${clientId}, redirect_uri=${redirectUri}, grant_type=authorization_code`)
    
    try {
      console.log('[API] Sending token exchange request to Google')
      // Exchange the authorization code for tokens from Google
      const tokenResponse = await $fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      console.log('[API] Received token response, access token length:', 
                  tokenResponse.access_token ? tokenResponse.access_token.length : 'none',
                  'refresh token present:', !!tokenResponse.refresh_token,
                  'id token present:', !!tokenResponse.id_token)
      
      // Return the token response data to the client
      return {
        success: true,
        tokens: tokenResponse,
        // We don't include the client_secret in the response
        clientInfo: {
          clientId,
          hasClientSecret: !!clientSecret
        }
      }
    } catch (fetchError: any) {
      console.error('[API] Error exchanging code for tokens:', 
                    fetchError.response?.data || fetchError.message,
                    fetchError.stack)
      
      return {
        success: false,
        error: 'Token exchange failed',
        errorDetails: {
          message: fetchError.response?.data?.error_description || fetchError.response?.data?.error || fetchError.message,
          data: fetchError.response?.data,
          status: fetchError.response?.status
        }
      }
    }
  } catch (error: any) {
    console.error('[API] Error processing OIDC callback:', 
                  error.response?.data || error.message,
                  error.stack)
    
    return {
      success: false,
      error: 'OIDC callback processing failed',
      errorMessage: error.response?.data?.error_description || error.response?.data?.error || error.message,
      details: error.response?.data
    }
  }
})
