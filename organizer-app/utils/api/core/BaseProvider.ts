import type { IntegrationAccount } from '~/types/models'
import { hasValidOAuthTokens, refreshOAuthToken, updateAccountInStore } from '../core/oauthUtils'
import { makeApiRequest, ApiError } from '../core/apiUtils'
import type { ApiRequestOptions } from '../core/apiUtils'

/**
 * Base provider class with common functionality for all integration providers
 */
export abstract class BaseProvider {
  protected account: IntegrationAccount

  constructor(account: IntegrationAccount) {
    this.account = account
  }

  /**
   * Check if provider is authenticated
   * @returns True if authenticated
   */
  isAuthenticated(): boolean {
    return hasValidOAuthTokens(this.account)
  }

  /**
   * Authenticate with the provider
   * @returns True if authentication successful
   */
  async authenticate(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true
    }

    // Standard OAuth refresh flow for any account with a refresh token
    if (this.account.oauthData.refreshToken) {
      try {
        // Refresh token and get updated account
        const updatedAccount = await refreshOAuthToken(this.account)
        
        // Update this instance's account reference
        this.account = updatedAccount
        
        // Update the account in the pinia store
        updateAccountInStore(updatedAccount)
        
        console.log(`Successfully refreshed token for ${this.account.oauthData.email}`)
        return true
      } catch (error) {
        console.error(`Failed to refresh token for ${this.account.oauthData.email}:`, error)
        return false
      }
    }
    
    console.warn(`${this.account.oauthData.email} has no refresh token, would need to redirect to OAuth flow`)
    return false
  }
  
  /**
   * Make an authenticated request to the provider API
   * Handles authentication checks and errors with automatic retry
   * @param url API endpoint URL
   * @param options Request options
   * @returns Response data
   */
  protected async makeRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    const maxRetries = 2; // Maximum number of retries for token refresh
    let retryCount = 0;
    const provider = this.account.type;
    const email = this.account.oauthData.email;
    
    // Helper function to log with consistent format
    const log = (message: string) => console.log(`[${provider}:${email}] ${message}`);
    
    log(`About to make a request to ${url}`)

    while (true) {
      try {
        // Always check authentication state before making a request
        if (!this.isAuthenticated()) {
          log(`Token expired or missing, authenticating before request to ${url}`);
          const authenticated = await this.authenticate();
          if (!authenticated) {
            throw new Error(`Authentication failed for ${provider} provider`);
          }
          log(`Authentication successful, proceeding with request`);
        }
        
        // Make the actual API request
        log(`Making request to ${url}`);
        return await makeApiRequest(url, this.account, options) as T;
      } catch (error) {
        // Handle different error cases
        if (error instanceof ApiError) {
          const status = error.status;
          
          // Handle unauthorized errors (expired token)
          if ((status === 401 || status === 403) && retryCount < maxRetries) {
            retryCount++;
            log(`Received ${status} error (try ${retryCount}/${maxRetries}), refreshing token and retrying`);
            
            try {
              // Force token refresh regardless of current token state
              this.account = await refreshOAuthToken(this.account);
              log(`Token refreshed successfully, retrying request`);
              continue; // Retry the request with new token
            } catch (refreshError: unknown) {
              const errorMessage = refreshError instanceof Error 
                ? refreshError.message 
                : String(refreshError);
              log(`Token refresh failed: ${errorMessage}`);
              throw new Error(`Authentication error: Token refresh failed - ${errorMessage}`);
            }
          }
          
          // For rate limiting errors, we could implement backoff retry here
          if (status === 429 && retryCount < maxRetries) {
            retryCount++;
            const backoffTime = 1000 * retryCount; // Simple backoff strategy
            log(`Rate limited (${status}), backing off for ${backoffTime}ms before retry ${retryCount}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue; // Retry after backoff
          }
          
          // For other status errors, add context before rethrowing
          log(`Request failed with status ${status}: ${error.message}`);
          throw new Error(`${provider} API error (${status}): ${error.message}`);
        }
        
        // For network or other non-API errors
        log(`Request failed with error: ${error}`);
        throw error; // Rethrow original error
      }
    }
  }
  
  /**
   * Get the provider type (for logging and error messages)
   * @returns The provider type from the account
   */
  getProviderType(): string {
    return this.account.type
  }
  
  /**
   * Get the user's email (for logging and error messages)
   * @returns The email address from the account
   */
  getUserEmail(): string {
    return this.account.oauthData.email
  }
}
