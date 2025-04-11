import type { IntegrationAccount } from '~/types/models'

/**
 * Utility functions for email integrations
 */

/**
 * Check if an integration account has valid OAuth tokens
 * @param account The integration account to check
 * @returns Boolean indicating if the account has valid tokens
 */
export function hasValidOAuthTokens(account: IntegrationAccount): boolean {
  // Must have access token
  if (!account.accessToken) {
    return false
  }
  
  // Check if token is expired
  if (account.tokenExpiry) {
    const now = new Date()
    const expiryDate = new Date(account.tokenExpiry)
    
    if (now > expiryDate) {
      // Token is expired, check for refresh token
      return !!account.refreshToken
    }
  }
  
  return true
}

/**
 * Gets a human-readable status message for an integration account
 * @param account The integration account to check
 * @returns Status message for the account
 */
export function getAccountStatusMessage(account: IntegrationAccount): string {
  if (!account.connected) {
    return 'Not connected'
  }
  
  if (!hasValidOAuthTokens(account)) {
    return 'Authentication required'
  }
  
  // Check that proper scopes are granted for mail access
  if (account.type === 'google' && account.scope) {
    if (!account.scope.includes('gmail.readonly') && 
        !account.scope.includes('gmail.send') && 
        !account.scope.includes('gmail.modify') && 
        !account.scope.includes('gmail.labels')) {
      return 'Gmail permissions required'
    }
  } else if ((account.type === 'office365' || account.type === 'exchange') && account.scope) {
    if (!account.scope.includes('Mail.Read')) {
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
  if (!account.connected) {
    return 'error'
  }
  
  if (!hasValidOAuthTokens(account)) {
    return 'warning'
  }
  
  // Check scopes
  if (account.type === 'google' && account.scope) {
    if (!account.scope.includes('gmail.readonly') && 
        !account.scope.includes('gmail.send') && 
        !account.scope.includes('gmail.modify') && 
        !account.scope.includes('gmail.labels')) {
      return 'warning'
    }
  } else if ((account.type === 'office365' || account.type === 'exchange') && account.scope) {
    if (!account.scope.includes('Mail.Read')) {
      return 'warning'
    }
  }
  
  return 'success'
}

/**
 * Utility to refresh an OAuth token
 * @param account The integration account
 * @returns Updated account with new access token
 */
export async function refreshOAuthToken(account: IntegrationAccount): Promise<IntegrationAccount> {
  if (!account.refreshToken) {
    throw new Error('No refresh token available')
  }
  
  if (account.type === 'google') {
    console.log('Refreshing Google OAuth token')
    // In a real app, this would call the Google token endpoint
    
    // Mock token refresh
    const mockResult = {
      accessToken: `new-google-token-${Date.now()}`,
      expiresIn: 3600
    }
    
    return {
      ...account,
      accessToken: mockResult.accessToken,
      tokenExpiry: new Date(Date.now() + (mockResult.expiresIn * 1000)),
      updatedAt: new Date()
    }
  } else if (account.type === 'office365' || 
            (account.type === 'exchange' && account.server?.includes('office365'))) {
    console.log('Refreshing Microsoft OAuth token')
    // In a real app, this would call the Microsoft token endpoint
    
    // Mock token refresh
    const mockResult = {
      accessToken: `new-microsoft-token-${Date.now()}`,
      expiresIn: 3600
    }
    
    return {
      ...account,
      accessToken: mockResult.accessToken,
      tokenExpiry: new Date(Date.now() + (mockResult.expiresIn * 1000)),
      updatedAt: new Date()
    }
  }
  
  throw new Error(`Unsupported account type: ${account.type}`)
}
