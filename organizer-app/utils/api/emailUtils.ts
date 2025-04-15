import type { IntegrationAccount } from '~/types/models'
import { useAuthStore } from '~/stores/auth'

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
  if (!account.oauthData.accessToken) {
    return false
  }
  
  // Check if token is expired
  if (account.oauthData.tokenExpiry) {
    const now = new Date()
    const expiryDate = new Date(account.oauthData.tokenExpiry)
    
    if (now > expiryDate) {
      // Token is expired, check for refresh token
      return !!account.oauthData.refreshToken
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
 */
export async function refreshOAuthToken(account: IntegrationAccount): Promise<IntegrationAccount> {
  if (!account.oauthData.refreshToken) {
    throw new Error('No refresh token available')
  }
  
  console.log(`Refreshing oAuth token for account: ${account.type}`)
  
  if (account.type === 'google') {
    console.log(`Refreshing Google OAuth token for ${account.oauthData.email} using refresh token`);
    
    try {
      // Try server-side token refresh first
      console.log(`Attempting to refresh Google token using server-side endpoint for ${account.oauthData.email}`);
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: account.oauthData.refreshToken,
          provider: 'google',
          email: account.oauthData.email
        }),
      });
      
      // First check if the response is actually JSON to avoid parsing errors
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', await response.text());
        throw new Error('Server returned non-JSON response');
      }
      
      if (response.ok) {
        const tokens = await response.json();
        console.log('Server-side token refresh successful');
        
        return {
          ...account,
          oauthData: {
            ...account.oauthData, 
            tokenExpiry: new Date(Date.now() + (tokens.expires_in * 1000)),
            ...tokens, 
            updatedAt: new Date(),
          }
        };
      } else {
        // If server-side refresh fails with a JSON error, log it
        const errorData = await response.json();
        console.error('Server-side token refresh failed:', errorData);
      }
      
      // Fallback token when oauth refresh fails
      console.warn('All OAuth refresh methods failed, using temporary token for debug and testing');

    } catch (error: any) {
      console.error('OAuth refresh failed:', error);
      
    }
  } else if (account.type === 'office365' || 
            (account.type === 'exchange')) {
    console.log(`Refreshing Microsoft OAuth token for ${account.oauthData.email} using refresh token`);
    
    try {
      // Try server-side token refresh
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: account.oauthData.refreshToken,
          provider: 'microsoft',
          email: account.oauthData.email
        }),
      });
      
      // First check if the response is actually JSON to avoid parsing errors
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', await response.text());
        throw new Error('Server returned non-JSON response');
      }
      
      if (response.ok) {
        const tokens = await response.json();
        console.log('Token refresh successful');
        
        // Update the account with new token
        return {
          ...account,
          oauthData: {
            ...account.oauthData, 
            ...tokens, 
            updatedAt: new Date(),
            tokenExpiry: new Date(Date.now() + (tokens.expires_in * 1000)),
          }
        };
      }
      
      // Fallback token when oauth refresh fails
      console.warn('All Microsoft OAuth refresh methods failed, using temporary token for debug and testing');
    } catch (error: any) {
      console.error('Microsoft OAuth refresh failed:', error);

    }
  }
  
  throw new Error(`Unsupported account type: ${account.type}`)
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
