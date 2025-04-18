/**
 * API utilities for making authenticated requests to external services
 */

import type { IntegrationAccount } from '~/types/models'

/**
 * Options for API requests 
 */
export interface ApiRequestOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Query parameters */
  params?: Record<string, string>;
}

/**
 * Error thrown by API requests
 */
export class ApiError extends Error {
  status: number;
  statusText: string;
  responseText?: string;
  
  constructor(message: string, status: number, statusText: string, responseText?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.responseText = responseText;
  }
}

/**
 * Build authentication headers for requests based on account type
 * @param account Integration account
 * @returns Headers with authentication information
 */
export function buildAuthHeaders(account: IntegrationAccount): Record<string, string> {
  if (!account.oauthData?.accessToken) {
    throw new Error(`No access token for account ${account.oauthData?.email}`);
  }
  
  // Standard OAuth2 headers used by most providers
  return {
    'Authorization': `Bearer ${account.oauthData.accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Make an authenticated API request to an external service
 * @param url API endpoint URL
 * @param account Integration account for authentication
 * @param options Request options
 * @returns Response data parsed as JSON
 * @throws ApiError if the request fails
 */
export async function makeApiRequest(
  url: string,
  account: IntegrationAccount,
  options: ApiRequestOptions = {}
): Promise<any> {
  const { method = 'GET', headers = {}, body, params } = options;
  
  try {
    // Build URL with query parameters if provided
    let finalUrl = url;
    if (params) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        queryParams.append(key, value);
      }
      finalUrl = `${url}?${queryParams.toString()}`;
    }
    
    // Merge auth headers with provided headers
    const authHeaders = buildAuthHeaders(account);
    const finalHeaders = { ...authHeaders, ...headers };
    
    // Log request details for debugging (truncate token)
    const logHeaders = { ...finalHeaders };
    if (logHeaders.Authorization) {
      logHeaders.Authorization = logHeaders.Authorization.substring(0, 20) + '...';
    }
    
    console.log(`[API] ${method} ${finalUrl}`, { headers: logHeaders });
    
    // Make the request
    const response = await fetch(finalUrl, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined
    });
    
    // Check if response is OK
    if (!response.ok) {
      // Try to get error details from response
      let errorText = '';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } else {
          errorText = await response.text();
        }
      } catch (error) {
        errorText = 'Could not parse error response';
      }
      
      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
        errorText
      );
    }
    
    // Check if response is empty
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      return null;
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    // Return text for non-JSON responses
    return await response.text();
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error(`[API] Request failed:`, error);
    // Handle unknown error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ApiError(
      `API request failed: ${errorMessage}`,
      500,
      'Internal Error',
      errorMessage
    );
  }
}
