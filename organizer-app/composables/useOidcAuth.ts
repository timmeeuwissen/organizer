import { ref, reactive } from 'vue'
import { UserManager, WebStorageStateStore, User, Log } from 'oidc-client-ts'
import { useRuntimeConfig } from 'nuxt/app'

// Configure logging for debugging
Log.setLogger(console)
Log.setLevel(Log.INFO)

// Store the UserManager instance to keep it consistent
let _userManager: UserManager | null = null

export function useOidcAuth() {
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)
  const error = ref<Error | null>(null)
  const isLoading = ref(false)

  /**
   * Initialize the OIDC UserManager with the specified provider settings
   */
  function initializeUserManager(providerId: string, clientId: string, clientSecret?: string) {
    // Common settings for all providers
    const baseSettings = {
      automaticSilentRenew: true,
      filterProtocolClaims: true,
      loadUserInfo: true,
      userStore: new WebStorageStateStore({ store: window.localStorage })
    }
    
    // Provider-specific settings
    const providerSettings: Record<string, any> = {
      google: {
        authority: 'https://accounts.google.com',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: window.location.origin + '/auth/callback',
        post_logout_redirect_uri: window.location.origin,
        response_type: 'token id_token',
        scope: 'openid email profile ' +
          'https://www.googleapis.com/auth/gmail.readonly ' +
          'https://www.googleapis.com/auth/gmail.modify ' +
          'https://www.googleapis.com/auth/gmail.labels ' +
          'https://www.googleapis.com/auth/gmail.send ' +
          'https://www.googleapis.com/auth/calendar.readonly ' +
          'https://www.googleapis.com/auth/contacts.readonly ' +
          'https://www.googleapis.com/auth/tasks.readonly',
        prompt: 'consent',
        accessTokenExpiringNotificationTime: 10,
        includeGrantedScopes: true,
        useImplicitFlow: true
      },
      // Add support for other providers as needed
      microsoft: {
        authority: 'https://login.microsoftonline.com/common',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: window.location.origin + '/auth/callback',
        post_logout_redirect_uri: window.location.origin,
        response_type: 'code',
        scope: 'openid email profile offline_access',
        prompt: 'consent',
        accessTokenExpiringNotificationTime: 10
      }
    }
    
    // Ensure the provider exists in our settings
    if (!providerSettings[providerId]) {
      throw new Error(`Unsupported provider: ${providerId}`)
    }
    
    // Create and store the UserManager instance
    _userManager = new UserManager({
      ...baseSettings,
      ...providerSettings[providerId]
    })
    
    // Set up event handlers
    _userManager.events.addUserLoaded((loadedUser) => {
      console.log(`OIDC: User loaded for ${providerId}`, loadedUser)
      user.value = loadedUser
      isAuthenticated.value = true
    })
    
    _userManager.events.addUserUnloaded(() => {
      console.log(`OIDC: User unloaded for ${providerId}`)
      user.value = null
      isAuthenticated.value = false
    })
    
    _userManager.events.addSilentRenewError((err) => {
      console.error(`OIDC: Silent renew error for ${providerId}`, err)
      error.value = err
    })
    
    _userManager.events.addAccessTokenExpiring(() => {
      console.log(`OIDC: Access token expiring for ${providerId}`)
    })
    
    return _userManager
  }
  
  /**
   * Begin the login process using the popup approach
   */
  async function loginWithPopup(providerId: string, clientId?: string, clientSecret?: string) {
    isLoading.value = true
    error.value = null
    
    try {
      // Use runtime config if no clientId/secret is provided
      const runtimeConfig = useRuntimeConfig()
      const actualClientId = clientId || runtimeConfig.public.google?.clientId
      // Try to get client secret from environment
      const actualClientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET
      
      if (!actualClientId) {
        throw new Error(`No client ID provided for ${providerId}`)
      }
      
      // Initialize the UserManager if needed
      const userManager = _userManager || initializeUserManager(providerId, actualClientId, actualClientSecret)
      
      // Start the popup login process
      const popupUser = await userManager.signinPopup()
      
      // Update state
      user.value = popupUser
      isAuthenticated.value = true
      
      // Format tokens for app consumption
      const tokens = formatUserTokens(popupUser, providerId)
      
      return tokens
    } catch (err) {
      console.error(`OIDC popup login error for ${providerId}:`, err)
      error.value = err as Error
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Begin the login process using the redirect approach
   */
  async function loginWithRedirect(providerId: string, clientId?: string, clientSecret?: string) {
    isLoading.value = true
    error.value = null
    
    try {
      // Use runtime config if no clientId/secret is provided
      const runtimeConfig = useRuntimeConfig()
      const actualClientId = clientId || runtimeConfig.public.google?.clientId
      // Try to get client secret from environment
      const actualClientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET
      
      if (!actualClientId) {
        throw new Error(`No client ID provided for ${providerId}`)
      }
      
      // Initialize the UserManager if needed
      const userManager = _userManager || initializeUserManager(providerId, actualClientId, actualClientSecret)
      
      // Start the redirect login process
      await userManager.signinRedirect()
    } catch (err) {
      console.error(`OIDC redirect login error for ${providerId}:`, err)
      error.value = err as Error
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Handle the callback after authentication redirect
   */
  async function handleAuthCallback() {
    isLoading.value = true
    error.value = null
    
    try {
      // UserManager must be initialized before handling the callback
      if (!_userManager) {
        throw new Error('UserManager not initialized')
      }
      
      // Process the callback
      const callbackUser = await _userManager.signinRedirectCallback()
      
      // Update state
      user.value = callbackUser
      isAuthenticated.value = true
      
      return callbackUser
    } catch (err) {
      console.error('OIDC callback handling error:', err)
      error.value = err as Error
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Logout the current user
   */
  async function logout() {
    if (!_userManager) {
      console.warn('Cannot logout: UserManager not initialized')
      return
    }
    
    try {
      await _userManager.signoutRedirect()
    } catch (err) {
      console.error('OIDC logout error:', err)
      error.value = err as Error
    }
  }
  
  /**
   * Format user tokens to match the application's expected format
   */
  function formatUserTokens(user: User, providerId: string) {
    return {
      accessToken: user.access_token,
      refreshToken: user.refresh_token,
      userId: user.profile.sub,
      email: user.profile.email,
      provider: providerId,
      tokenExpiry: new Date((user.expires_at || Date.now() + 3600) * 1000),
      idToken: user.id_token
    }
  }
  
  /**
   * Get the current authenticated user
   */
  async function getUser() {
    if (!_userManager) {
      console.warn('Cannot get user: UserManager not initialized')
      return null
    }
    
    try {
      const currentUser = await _userManager.getUser()
      user.value = currentUser
      isAuthenticated.value = !!currentUser
      return currentUser
    } catch (err) {
      console.error('OIDC get user error:', err)
      error.value = err as Error
      return null
    }
  }
  
  return {
    isAuthenticated,
    user,
    error,
    isLoading,
    initializeUserManager,
    loginWithPopup,
    loginWithRedirect,
    handleAuthCallback,
    logout,
    getUser,
    formatUserTokens
  }
}
