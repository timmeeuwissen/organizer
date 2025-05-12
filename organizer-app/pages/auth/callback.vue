<template>
  <div class="auth-callback">
    <div class="d-flex justify-center align-center flex-column" style="min-height: 300px">
      <v-progress-circular
        v-if="loading"
        indeterminate
        color="primary"
        size="64"
      ></v-progress-circular>
      <div v-else class="text-center">
        <v-icon
          :color="success ? 'success' : 'error'"
          size="64"
          class="mb-4"
        >
          {{ success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        <h2 class="text-h5 mb-2">{{ title }}</h2>
        <p class="text-body-1">{{ message }}</p>
        <v-btn
          color="primary"
          class="mt-6"
          @click="closeWindow"
        >
          Close Window
        </v-btn>
      </div>
    </div>
    
    <!-- Debug information panel -->
    <div class="debug-panel mt-8">
      <h3 class="text-h6 mb-2">Debug Information</h3>
      <pre class="debug-info">{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Define the layout for this page
definePageMeta({
  layout: 'blank'
})

// State
const loading = ref(true)
const success = ref(false)
const title = ref('Processing Authentication...')
const message = ref('Please wait while we complete your authentication.')

// Methods
function closeWindow() {
  // Close the popup window
  // window.close()
  
  // Fallback if window.close() doesn't work (some browsers block it)
  message.value = 'You can now close this window.'
}

// Parse URL hash parameters
function parseHashParams() {
  const hash = window.location.hash.substring(1);
  return hash.split('&').reduce((result, item) => {
    const parts = item.split('=');
    if (parts.length === 2) {
      result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    }
    return result;
  }, {});
}

// Handle authorization code flow
async function handleCodeFlow(code) {
  try {
    addDebugInfo('Handling authorization code flow with code: ' + code.substring(0, 5) + '...');
    
    // Get search params for access to state
    const searchParams = new URLSearchParams(window.location.search);
    
    // Send the authorization code to our server-side API for token exchange
    addDebugInfo('Sending code to server API');
    const response = await fetch('/api/auth/oidc-callback' + window.location.search);
    const data = await response.json();
    
    addDebugInfo('Server response: ' + (data.success ? 'SUCCESS' : 'FAILED'));
    
    if (!data.success) {
      const errorMsg = data.error || 'Unknown error during token exchange';
      addDebugInfo('Error from server: ' + errorMsg);
      throw new Error(errorMsg);
    }
    
    addDebugInfo('Successfully exchanged code for tokens');
    
    // Try to parse the state parameter for additional information
    let returnUrl = '/';
    if (searchParams.has('state')) {
      try {
        addDebugInfo('Found state parameter, attempting to parse');
        const stateParam = searchParams.get('state');
        addDebugInfo('State value: ' + stateParam.substring(0, 20) + '...');
        const stateObj = JSON.parse(decodeURIComponent(stateParam));
        if (stateObj.origin) {
          addDebugInfo('Found origin in state: ' + stateObj.origin);
          returnUrl = stateObj.origin;
        }
      } catch (e) {
        addDebugInfo('Error parsing state: ' + e.message);
      }
    }
    
    // Store tokens in localStorage or broadcast a message to parent window
    if (window.opener && window.opener !== window) {
      // Send tokens back to the opener window
      addDebugInfo('Found opener window, sending post message');
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        tokens: data.tokens
      }, window.location.origin);
      
      // Set UI state
      success.value = true;
      title.value = 'Authentication Successful';
      message.value = 'You have successfully authenticated with Google. This window will close automatically.';
      
      // Close window automatically after a short delay
      setTimeout(() => {
        addDebugInfo('Attempting to close window');
        window.close();
      }, 3000);
    } else {
      // No opener window - we were probably redirected here
      addDebugInfo('No opener window found, likely a direct redirect');
      
      // Store tokens in localStorage temporarily
      try {
        localStorage.setItem('googleAuth_tokens', JSON.stringify(data.tokens));
        localStorage.setItem('googleAuth_timestamp', Date.now().toString());
        addDebugInfo('Stored tokens in localStorage');
      } catch (e) {
        addDebugInfo('Error storing tokens: ' + e.message);
      }
      
      // Set UI state
      success.value = true;
      title.value = 'Authentication Successful';
      message.value = 'Authentication successful. Redirecting you back...';
      
      // Redirect to the return URL after a short delay
      setTimeout(() => {
        addDebugInfo('Redirecting to: ' + returnUrl);
        window.location.href = returnUrl;
      }, 2000);
    }
  } catch (error) {
    console.error('Error during code exchange:', error);
    
    // Notify the opener of the error
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error.message || 'Authentication failed during code exchange'
      }, window.location.origin);
    }
    
    success.value = false;
    title.value = 'Authentication Failed';
    message.value = error.message || 'An error occurred during authentication. Please try again later.';
  } finally {
    loading.value = false;
  }
}

// Directly put some debugging info in the DOM to help troubleshoot
const debugInfo = ref('Initializing...');
function addDebugInfo(info) {
  debugInfo.value += '\n' + info;
  console.log('[Callback Debug]', info);
}

// Process the authentication on mount
onMounted(() => {
  try {
    // Create a big message in console to make it obvious when this page loads
    console.log('%c AUTH CALLBACK PAGE LOADED ', 'background: #4CAF50; color: white; font-size: 20px;');
    
    addDebugInfo('Callback page loaded at ' + new Date().toISOString());
    addDebugInfo('URL: ' + window.location.href);
    
    // First log the URL for debugging
    console.log('Auth callback URL:', window.location.href);
    console.log('Auth callback hash:', window.location.hash);
    
    // Check if there's an error in the hash or search params
    const hashParams = parseHashParams();
    const searchParams = new URLSearchParams(window.location.search);
    
    // Log all params for debugging
    addDebugInfo('Hash params: ' + JSON.stringify(hashParams));
    addDebugInfo('Search params: ' + JSON.stringify(Object.fromEntries(searchParams.entries())));
    
    // Check for errors in hash or query parameters
    if (hashParams.error) {
      addDebugInfo('ERROR in hash: ' + hashParams.error);
      throw new Error(`OAuth error in hash: ${hashParams.error}. Description: ${hashParams.error_description || 'No description'}`);
    }
    
    if (searchParams.has('error')) {
      addDebugInfo('ERROR in query: ' + searchParams.get('error'));
      throw new Error(`OAuth error in query: ${searchParams.get('error')}. Description: ${searchParams.get('error_description') || 'No description'}`);
    }
    
    // With implicit flow, tokens are in the URL fragment
    addDebugInfo('Processing authentication callback');
    const accessToken = hashParams.access_token;
    const idToken = hashParams.id_token;
    const expiresIn = hashParams.expires_in || '3600';
    
    // Also check for code in case we're getting a code response
    const code = searchParams.get('code');
    
    if (code) {
      addDebugInfo('Found authorization code: ' + code.substring(0, 5) + '...');
      // Handle code flow if that's what we got
      handleCodeFlow(code);
      return;
    }
    
    if (!accessToken && !idToken) {
      addDebugInfo('No tokens or code found in response!');
      throw new Error('No tokens or authorization code found in the response');
    }
    
    // Create token object
    const tokens = {
      access_token: accessToken,
      id_token: idToken,
      expires_in: parseInt(expiresIn, 10),
      // Note: refresh_token is not available in implicit flow
      // If offline access is needed, you'll need to use auth code flow
      token_type: hashParams.token_type || 'Bearer'
    };
    
    console.log('Parsed tokens from URL fragment');
    
    // Store tokens in localStorage or broadcast a message to parent window
    if (window.opener && window.opener !== window) {
      // Send tokens back to the opener window
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        tokens: tokens
      }, window.location.origin);
      
      // Set UI state
      success.value = true;
      title.value = 'Authentication Successful';
      message.value = 'You have successfully authenticated with Google. This window will close automatically.';
      
      // Close window automatically after a short delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      // No opener, just show success
      success.value = true;
      title.value = 'Authentication Successful';
      message.value = 'Authentication successful. You can close this window.';
    }
  } catch (error) {
    console.error('Error processing authentication callback:', error);
    
    // Notify the opener of the error
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error.message || 'Authentication failed'
      }, window.location.origin);
    }
    
    success.value = false;
    title.value = 'Authentication Failed';
    message.value = error.message || 'An error occurred during authentication. Please try again later.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.auth-callback {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.debug-panel {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 2rem;
  text-align: left;
}

.debug-info {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.85rem;
  background-color: #333;
  color: #fff;
  padding: 1rem;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}
</style>
