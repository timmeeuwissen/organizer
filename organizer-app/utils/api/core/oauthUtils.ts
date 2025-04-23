import type { IntegrationAccount } from '~/types/models'
import { useAuthStore } from '~/stores/auth'

/**
 * Check if an integration account has valid OAuth tokens
 * @param account The integration account to check
 * @returns Boolean indicating if the account has valid tokens
 */
export function hasValidOAuthTokens(account: IntegrationAccount): boolean {
  // Must have access token
  if (!account.oauthData.accessToken) {
    console.log(`[OAuth] ${account.oauthData.email}: No access token found`)
    return false
  }
  
  // Check if token is expired
  if (account.oauthData.tokenExpiry) {
    const now = new Date()
    // Add 30-second buffer to account for network latency and clock differences
    const bufferedNow = new Date(now.getTime() + 30 * 1000)
    const expiryDate = new Date(account.oauthData.tokenExpiry)
    
    if (bufferedNow > expiryDate) {
      console.log(`[OAuth] ${account.oauthData.email}: Token expired at ${expiryDate.toISOString()}, current time: ${now.toISOString()}`)
      // We no longer return true just because there's a refresh token
      // Instead, we'll force a refresh by returning false
      return false
    }
  } else {
    // If there's no expiry date, we can't determine validity
    console.log(`[OAuth] ${account.oauthData.email}: No token expiry date, assuming expired`)
    return false
  }
  
  return true
}

/**
 * Gets a human-readable status message for an integration account
 * @param account The integration account to check
 * @returns Status message for the account
 */
export function getAccountStatusMessage(account: IntegrationAccount): string {
  if (!account.oauthData.connected) {
    return 'Not connected'
  }
  
  if (!hasValidOAuthTokens(account)) {
    return 'Authentication required'
  }
  
  // Check that proper scopes are granted for mail access
  if (account.type === 'google' && account.oauthData.scope) {
    if (!account.oauthData.scope.includes('gmail.readonly') && 
        !account.oauthData.scope.includes('gmail.send') && 
        !account.oauthData.scope.includes('gmail.modify') && 
        !account.oauthData.scope.includes('gmail.labels') &&
        !account.oauthData.scope.includes('https://www.googleapis.com/auth/gmail.readonly')) {
      return 'Gmail permissions required'
    }
  } else if ((account.type === 'office365' || account.type === 'exchange') && account.oauthData.scope) {
    if (!account.oauthData.scope.includes('Mail.Read')) {
      return 'Mail access permissions required'
    }
  }
  
  return 'Connected'
}

/**
 * Gets color for account status
 * @param account The integration account
 * @returns Color name for the status
 */
export function getAccountStatusColor(account: IntegrationAccount): string {
  if (!account.oauthData.connected) {
    return 'error'
  }
  
  if (!hasValidOAuthTokens(account)) {
    return 'warning'
  }
  
  // Check scopes
  if (account.type === 'google' && account.oauthData.scope) {
    if (!account.oauthData.scope.includes('gmail.readonly') && 
        !account.oauthData.scope.includes('gmail.send') && 
        !account.oauthData.scope.includes('gmail.modify') && 
        !account.oauthData.scope.includes('gmail.labels') && 
        !account.oauthData.scope.includes('https://www.googleapis.com/auth/gmail.readonly')) {
      return 'warning'
    }
  } else if ((account.type === 'office365' || account.type === 'exchange') && account.oauthData.scope) {
    if (!account.oauthData.scope.includes('Mail.Read')) {
      return 'warning'
    }
  }
  
  return 'success'
}

/**
 * Utility to refresh an OAuth token
 * @param account The integration account
 * @returns Updated account with new access token
 * @throws Error if token refresh fails
 */
export async function refreshOAuthToken(account: IntegrationAccount): Promise<IntegrationAccount> {
  if (!account.oauthData.refreshToken) {
    console.error(`[OAuth] No refresh token available for ${account.oauthData.email}`)
    throw new Error(`No refresh token available for ${account.oauthData.email}`)
  }
  
  console.log(`[OAuth] Refreshing token for ${account.type} account: ${account.oauthData.email}`)
  
  let provider = ''
  if (account.type === 'google') {
    provider = 'google'
  } else if (account.type === 'office365' || account.type === 'exchange') {
    provider = 'microsoft'
  } else {
    throw new Error(`Unsupported account type: ${account.type}`)
  }
  
  try {
    // Use a single code path for all provider types
    console.log(`[OAuth] Refreshing ${provider} token for ${account.oauthData.email} using server-side endpoint`)
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: account.oauthData.refreshToken,
        provider,
        email: account.oauthData.email
      }),
    })
    
    // Validate response format
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await response.text()
      console.error(`[OAuth] Server returned non-JSON response for ${account.oauthData.email}:`, errorText)
      throw new Error(`Server returned non-JSON response: ${errorText}`)
    }
    
    // Check response status
    if (!response.ok) {
      const errorData = await response.json()
      console.error(`[OAuth] Token refresh failed for ${account.oauthData.email}:`, errorData)
      
      // Handle specific error cases
      if (errorData.error === 'invalid_grant') {
        // This indicates the refresh token is expired or revoked
        // Mark the account as disconnected so the UI can prompt for re-auth
        const updatedAccount = {
          ...account,
          oauthData: {
            ...account.oauthData,
            connected: false,
            updatedAt: new Date()
          }
        };
        
        // Update in store to reflect disconnected status
        updateAccountInStore(updatedAccount)
        
        // Mark this account for reauthorization
        try {
          const { markAccountForReauth } = await import('../mailProviders/googleAuthUtils')
          markAccountForReauth(account)
        } catch (importError) {
          console.error('Failed to import googleAuthUtils:', importError)
        }
        
        throw new Error(`Your Google account authorization has expired or been revoked. Please re-authorize your account.`)
      }
      
      // General error handling for other cases
      throw new Error(`Token refresh failed: ${JSON.stringify(errorData)}`)
    }
    
    // Parse the tokens from the response
    const tokens = await response.json()
    console.log(`[OAuth] Successfully refreshed token for ${account.oauthData.email}`)
    
    // Ensure we have an access token
    if (!tokens.accessToken && !tokens.access_token) {
      console.error(`[OAuth] Token response missing access token for ${account.oauthData.email}`, tokens)
      throw new Error(`Token refresh failed: Missing access token in response`)
    }
    
    // Normalize token structure - some servers return snake_case, others camelCase
    const normalizedTokens = {
      accessToken: tokens.accessToken || tokens.access_token,
      refreshToken: tokens.refreshToken || tokens.refresh_token || account.oauthData.refreshToken,
      expiresIn: tokens.expires_in || tokens.expiresIn || 3600, // Default to 1 hour if not specified
      tokenType: tokens.token_type || tokens.tokenType || 'Bearer',
      scope: tokens.scope || account.oauthData.scope
    }
    
    console.log(`[OAuth] Processed token for ${account.oauthData.email}, expires in ${normalizedTokens.expiresIn} seconds`)
    
    // Calculate actual expiry time with a 10% safety margin to account for clock skew
    const expiryWithMargin = new Date(Date.now() + (normalizedTokens.expiresIn * 1000 * 0.9))
    console.log(`[OAuth] Token for ${account.oauthData.email} valid until ${expiryWithMargin.toISOString()} (with safety margin)`)
    
    // Return the updated account with new token information
    const updatedAccount = {
      ...account,
      oauthData: {
        ...account.oauthData,
        accessToken: normalizedTokens.accessToken,
        refreshToken: normalizedTokens.refreshToken,
        tokenType: normalizedTokens.tokenType,
        scope: normalizedTokens.scope,
        tokenExpiry: expiryWithMargin,
        updatedAt: new Date(),
        connected: true
      }
    }
    
    // Update in store immediately to ensure it's saved
    updateAccountInStore(updatedAccount)
    
    return updatedAccount
  } catch (error: any) {
    console.error(`[OAuth] Failed to refresh token for ${account.oauthData.email}:`, error)
    // Rethrow the error with context for proper handling
    throw new Error(`Could not refresh token for ${account.oauthData.email}: ${error.message}`)
  }
}

/**
 * Updates the account in Pinia store after refreshing token
 * @param updatedAccount The integration account with refreshed tokens
 */
export function updateAccountInStore(updatedAccount: IntegrationAccount): void {
  // Get the auth store instance
  const authStore = useAuthStore();
  
  if (!authStore.currentUser || !authStore.currentUser.settings) {
    console.warn('Cannot update account in store: No current user or settings');
    return;
  }
  
  try {
    // Find the account in the user's settings
    const integrationAccounts = authStore.currentUser.settings.integrationAccounts || [];
    const accountIndex = integrationAccounts.findIndex(acc => acc.id === updatedAccount.id);
    
    // If the account exists, update it
    if (accountIndex >= 0) {
      // Create new settings object with updated integration account
      const updatedIntegrationAccounts = [...integrationAccounts];
      updatedIntegrationAccounts[accountIndex] = updatedAccount;
      
      // Update the settings in the store
      authStore.updateUserSettings({
        ...authStore.currentUser.settings,
        integrationAccounts: updatedIntegrationAccounts
      });
      
      console.log(`Updated account ${updatedAccount.oauthData.email} in auth store with refreshed token`);
    } else {
      console.warn(`Could not find account ${updatedAccount.oauthData.email} in auth store`);
    }
  } catch (error) {
    console.error('Error updating account in store:', error);
  }
}
