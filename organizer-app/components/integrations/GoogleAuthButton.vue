<template lang="pug">
div
  v-btn(
    :color="color || 'primary'"
    :loading="isLoading"
    @click="handleGoogleAuth"
    :disabled="isLoading || disabled"
    :block="block"
    :size="size"
  )
    v-icon(start v-if="icon") {{ icon }}
    slot {{ text || $t('settings.googlePopupAuth') }}
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'

// Props
const props = defineProps({
  color: {
    type: String,
    default: null
  },
  icon: {
    type: String,
    default: 'mdi-google'
  },
  text: {
    type: String,
    default: null
  },
  block: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'default'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['auth-success', 'auth-error'])

// State
const isLoading = ref(false)

// State for popup window
const authWindow = ref(null)
const messageListener = ref(null)

// Check for stored tokens when component is mounted (for direct redirect flow)
onMounted(() => {
  try {
    // Check if we have tokens from a redirect flow stored in localStorage
    const tokensJson = localStorage.getItem('googleAuth_tokens');
    const timestamp = localStorage.getItem('googleAuth_timestamp');
    
    if (tokensJson && timestamp) {
      console.log('[Google Auth] Found stored tokens from redirect flow');
      
      // Check if tokens are recent (within last 5 minutes)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge < 5 * 60 * 1000) { // 5 minutes
        console.log('[Google Auth] Tokens are recent, processing them');
        
        // Parse tokens
        const tokenData = JSON.parse(tokensJson);
        
        // Format the tokens into the expected format
        const tokens = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          idToken: tokenData.id_token,
          tokenExpiry: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          userId: null,
          email: null,
          provider: 'google'
        };
        
        // Extract user information from ID token if available
        if (tokenData.id_token) {
          try {
            // Parse the JWT payload
            const payload = JSON.parse(atob(tokenData.id_token.split('.')[1]));
            tokens.userId = payload.sub;
            tokens.email = payload.email;
          } catch (e) {
            console.error('[Google Auth] Error parsing ID token from localStorage:', e);
          }
        }
        
        // Clean up localStorage
        localStorage.removeItem('googleAuth_tokens');
        localStorage.removeItem('googleAuth_timestamp');
        
        // Emit success with tokens
        console.log('[Google Auth] Emitting tokens from redirect flow');
        emit('auth-success', tokens);
      } else {
        // Tokens are too old, clean up
        console.log('[Google Auth] Stored tokens are too old, removing them');
        localStorage.removeItem('googleAuth_tokens');
        localStorage.removeItem('googleAuth_timestamp');
      }
    }
  } catch (e) {
    console.error('[Google Auth] Error processing stored tokens:', e);
  }
});

// Cleanup function
onBeforeUnmount(() => {
  // Remove message event listener when component is destroyed
  if (messageListener.value) {
    window.removeEventListener('message', messageListener.value)
  }
  
  // Close any open auth window
  if (authWindow.value) {
    try {
      authWindow.value.close()
    } catch (e) {
      console.error('Error closing auth window:', e)
    }
  }
})

// Methods
function handleGoogleAuth() {
  // Set loading state
  console.log('[Google Auth] Handling google auth response')
  isLoading.value = true
  
  try {
    const runtimeConfig = useRuntimeConfig()
    const clientId = runtimeConfig.public.google.clientId
    console.log(`[Google Auth] working with public clientId ${clientId}`)
    
    // Set up message listener for the callback
    if (messageListener.value) {
      window.removeEventListener('message', messageListener.value)
    }
    
    messageListener.value = (event) => {
      console.log('[Google Auth] received message event')

      // Verify the origin of the message
      if (event.origin !== window.location.origin) {
        return
      }
      
      const { data } = event
      
      // Filter out messages from browser extensions or other sources
      if (!data.type || (data.source && data.source.includes('devtools'))) {
        console.log('[Google Auth] ignoring non-auth related message', data)
        return
      }
      
      console.log('[Google Auth] processing auth data', data)

      if (data.type === 'GOOGLE_AUTH_SUCCESS') {
        // Process the tokens from the Google auth flow
        console.log('[Google Auth] Received auth success message from popup')
        
        const tokenData = data.tokens
        
        // Format the tokens into the expected format
        const tokens = {
          accessToken: tokenData.access_token,
          // refreshToken may not be available in implicit flow
          refreshToken: tokenData.refresh_token || null,
          idToken: tokenData.id_token,
          tokenExpiry: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          userId: null, // Will be extracted from id_token claims
          email: null,  // Will be extracted from id_token claims
          provider: 'google'
        }
        
        // Extract user information from ID token if available
        if (tokenData.id_token) {
          try {
            // Parse the JWT payload (part between first and second dot)
            const payload = JSON.parse(atob(tokenData.id_token.split('.')[1]))
            tokens.userId = payload.sub
            tokens.email = payload.email
            
            // If we don't have a refresh token, log this for debugging
            if (!tokenData.refresh_token) {
              console.log('[Google Auth] No refresh token in response (normal for implicit flow)')
            }
          } catch (e) {
            console.error('[Google Auth] Error parsing ID token:', e)
          }
        }
        
        // Log and emit the tokens
        console.log('[Google Auth] Emitting tokens:', tokens)
        emit('auth-success', tokens)
        isLoading.value = false
      } 
      else if (data.type === 'GOOGLE_AUTH_ERROR') {
        // Handle authentication error
        console.error('[Google Auth] Received auth error message from popup:', data.error)
        emit('auth-error', new Error(data.error))
        isLoading.value = false
      }
      else {
        console.error('[Google Auth] Not sure what happened?', data)
      }
    }
    
    // Add the message listener
    window.addEventListener('message', messageListener.value)
    
    // Calculate parameters for OAuth URL
    const redirectUri = `${window.location.origin}/auth/callback`
    const scope = encodeURIComponent('openid email profile ' + 
      'https://www.googleapis.com/auth/gmail.readonly ' +
      'https://www.googleapis.com/auth/gmail.modify ' +
      'https://www.googleapis.com/auth/gmail.labels ' +
      'https://www.googleapis.com/auth/gmail.send ' +
      'https://www.googleapis.com/auth/calendar.readonly ' +
      'https://www.googleapis.com/auth/contacts.readonly ' +
      'https://www.googleapis.com/auth/tasks.readonly')
    
    // For debugging purposes, let's try direct redirection instead of a popup
    console.log('[Google Auth] Setting up authorization URL with code flow')
    const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(JSON.stringify({
        timestamp: Date.now(),
        origin: window.location.origin,
        debug: true
      }))}` +
      `&include_granted_scopes=true`

    console.log('[Google Auth] Authorization URL:', url)

    // Check if debug redirect mode is enabled via env var
    const config = useRuntimeConfig();
    const useDebugRedirect = config.public.debugAuthRedirect === 'true';
    
    if (useDebugRedirect) {
      console.log('[Google Auth] Debug redirect mode enabled, redirecting directly');
      // Redirect the current window to the auth URL
      window.location.href = url;
      return;
    }
    
    // If user cancels the confirmation, continue with popup approach
    console.log('[Google Auth] Opening popup as fallback')
    
    // Set a global variable to help with debugging
    window.authDebugInfo = {
      startTime: new Date().toISOString(),
      mainWindowUrl: window.location.href
    }

    // Open the authentication popup (more debugging-friendly options)
    const width = 800
    const height = 800
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    
    console.log('[Google Auth] opening popup')
    
    authWindow.value = window.open(
      url,
      'Google Authentication',
      `width=${width},height=${height},left=${left},top=${top},toolbar=1,scrollbars=1,status=1,resizable=1,location=1,menuBar=1`
    )
    
    // Handle the case where the popup is blocked
    if (!authWindow.value || authWindow.value.closed || typeof authWindow.value.closed === 'undefined') {
      isLoading.value = false
      console.error('[Google Auth] Popup blocked')
      throw new Error('Popup blocked! Please allow popups for this site.')
    }
    
    // Focus the popup
    console.log('[Google Auth] focusing popup')
    authWindow.value.focus()
    
    // TEMPORARILY DISABLED window closure detection to troubleshoot
    console.log('[Google Auth] Window closure detector is disabled for debugging')
    
    // Add window.onerror handler to catch any errors
    if (authWindow.value) {
      try {
        authWindow.value.addEventListener('error', (e) => {
          console.error('[Google Auth] Error in auth window:', e);
        });

        // Try to access the window's console
        authWindow.value.console = {
          ...authWindow.value.console,
          log: (msg) => {
            console.log('[Auth Window]', msg);
          },
          error: (msg) => {
            console.error('[Auth Window]', msg);
          }
        };
      } catch (e) {
        console.error('[Google Auth] Error setting up popup window error handler:', e);
      }
    }
    
    // After 10 seconds, check if we're still waiting (safeguard)
    setTimeout(() => {
      if (isLoading.value) {
        console.log('[Google Auth] Auth still in progress after 10s - continuing to wait');
      }
    }, 10000);
    
    // After 30 seconds, assume something went wrong if still loading
    setTimeout(() => {
      if (isLoading.value) {
        console.error('[Google Auth] Auth timeout after 30s');
        isLoading.value = false;
        try {
          if (authWindow.value && !authWindow.value.closed) {
            authWindow.value.close();
          }
        } catch (e) {
          console.error('[Google Auth] Error closing timed out window:', e);
        }
        emit('auth-error', new Error('Authentication timed out after 30 seconds'));
      }
    }, 30000);
    
  } catch (error) {
    console.error('[Google Auth] Google authentication error:', error)
    emit('auth-error', error)
    isLoading.value = false
  }
}
</script>
