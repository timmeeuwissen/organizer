import { defineEventHandler, readBody } from 'h3'

// Extract environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

/**
 * Server-side token refresh endpoint for OAuth providers
 * This endpoint allows the frontend to securely refresh OAuth tokens without
 * exposing client secrets in the browser
 */
export default defineEventHandler(async (event) => {
  // Get request body
  const body = await readBody(event)
  const { refreshToken, provider, email } = body

  if (!refreshToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Refresh token is required' })
    }
  }
  
  try {
    // Handle different providers
    if (provider === 'google') {
      // Check for required environment variables
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google API credentials in environment variables')
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Server configuration error - missing Google API credentials' 
          })
        }
      }
      
      console.log(`Refreshing Google OAuth token for ${email}`)
      
      // Log refresh request details (masking sensitive info)
      console.log('Google OAuth refresh request:', {
        clientIdPresent: !!GOOGLE_CLIENT_ID,
        clientSecretPresent: !!GOOGLE_CLIENT_SECRET,
        refreshTokenPresent: !!refreshToken,
        refreshTokenLength: refreshToken?.length || 0,
        refreshToken: refreshToken ? `${refreshToken.substring(0, 5)}...${refreshToken.substring(refreshToken.length - 5)}` : null
      })
      
      // Construct refresh token request
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })
      
      // Process the response
      if (!response.ok) {
        console.error('Problem occurred in response ro refresh token')

        let errorData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          console.error('Google refresh token error:', errorData);
        } else {
          errorData = await response.text();
          console.error('Google refresh token error (non-JSON):', errorData);
        }
        
        // Handle invalid_grant error specifically
        if (typeof errorData === 'object' && errorData.error === 'invalid_grant') {
          return {
            statusCode: response.status,
            body: JSON.stringify({
              error: 'invalid_grant',
              error_description: errorData.error_description || 'Refresh token is invalid or has expired. You may need to re-authenticate your account.'
            })
          }
        }
        
        return {
          statusCode: response.status,
          body: JSON.stringify({ 
            error: `Google OAuth error: ${response.status} ${response.statusText}`,
            details: errorData
          })
        }
      }
      
      // Return the new tokens
      const tokens = await response.json()
      return tokens
    } 
    else if (provider === 'microsoft') {
      // Similar implementation for Microsoft refresh would go here
      // For now, return an error
      return {
        statusCode: 501,
        body: JSON.stringify({ error: 'Microsoft refresh not yet implemented' })
      }
    } 
    else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Unsupported provider: ${provider}` })
      }
    }
  } catch (error) {
    console.error(`Error refreshing token for ${provider}:`, error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error during token refresh' })
    }
  }
})
