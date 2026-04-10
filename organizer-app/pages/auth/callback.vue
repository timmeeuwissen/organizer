<template>
  <div class="auth-callback">
    <div class="d-flex justify-center align-center flex-column" style="min-height: 300px">
      <v-progress-circular
        v-if="loading"
        indeterminate
        color="primary"
        size="64"
      />
      <div v-else class="text-center">
        <v-icon
          :color="success ? 'success' : 'error'"
          size="64"
          class="mb-4"
        >
          {{ success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        <h2 class="text-h5 mb-2">
          {{ title }}
        </h2>
        <p class="text-body-1">
          {{ message }}
        </p>
        <v-btn
          color="primary"
          class="mt-6"
          @click="closeWindow"
        >
          Close Window
        </v-btn>
      </div>
    </div>

    <div class="debug-panel mt-8">
      <h3 class="text-h6 mb-2">
        Debug Information
      </h3>
      <pre class="debug-info">{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'blank'
})

const loading = ref(true)
const success = ref(false)
const title = ref('Processing Authentication...')
const message = ref('Please wait while we complete your authentication.')

function closeWindow () {
  message.value = 'You can now close this window.'
}

function parseHashParams () {
  const hash = window.location.hash.substring(1)
  return hash.split('&').reduce((result, item) => {
    const parts = item.split('=')
    if (parts.length === 2) {
      result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1])
    }
    return result
  }, {})
}

function providerFromState (stateParam) {
  if (!stateParam) { return 'google' }
  try {
    const stateObj = JSON.parse(decodeURIComponent(stateParam))
    return stateObj.provider === 'microsoft' ? 'microsoft' : 'google'
  } catch {
    return 'google'
  }
}

const debugInfo = ref('Initializing...')
function addDebugInfo (info) {
  debugInfo.value += '\n' + info
  console.log('[Callback Debug]', info)
}

async function handleCodeFlow (code, provider) {
  try {
    addDebugInfo('Handling authorization code flow with code: ' + code.substring(0, 5) + '...')
    addDebugInfo('Provider (from state): ' + provider)

    addDebugInfo('Sending code to server API')
    const response = await fetch('/api/auth/oidc-callback' + window.location.search)
    const data = await response.json()

    addDebugInfo('Server response: ' + (data.success ? 'SUCCESS' : 'FAILED'))

    if (!data.success) {
      const errorMsg = data.error || 'Unknown error during token exchange'
      addDebugInfo('Error from server: ' + errorMsg)
      throw new Error(errorMsg)
    }

    addDebugInfo('Successfully exchanged code for tokens')

    const searchParams = new URLSearchParams(window.location.search)
    let returnUrl = '/'
    if (searchParams.has('state')) {
      try {
        const stateParam = searchParams.get('state')
        addDebugInfo('State value: ' + stateParam.substring(0, 20) + '...')
        const stateObj = JSON.parse(decodeURIComponent(stateParam))
        if (stateObj.origin) {
          addDebugInfo('Found origin in state: ' + stateObj.origin)
          returnUrl = stateObj.origin
        }
      } catch (e) {
        addDebugInfo('Error parsing state: ' + e.message)
      }
    }

    const successType = provider === 'microsoft' ? 'MICROSOFT_AUTH_SUCCESS' : 'GOOGLE_AUTH_SUCCESS'
    const providerLabel = provider === 'microsoft' ? 'Microsoft' : 'Google'
    const storageKey = provider === 'microsoft' ? 'microsoftAuth_tokens' : 'googleAuth_tokens'
    const storageTs = provider === 'microsoft' ? 'microsoftAuth_timestamp' : 'googleAuth_timestamp'

    if (window.opener && window.opener !== window) {
      addDebugInfo('Found opener window, sending post message: ' + successType)
      window.opener.postMessage(
        {
          type: successType,
          tokens: data.tokens
        },
        window.location.origin
      )

      success.value = true
      title.value = 'Authentication Successful'
      message.value = `You have successfully authenticated with ${providerLabel}. This window will close automatically.`

      setTimeout(() => {
        addDebugInfo('Attempting to close window')
        window.close()
      }, 3000)
    } else {
      addDebugInfo('No opener window found, likely a direct redirect')

      try {
        localStorage.setItem(storageKey, JSON.stringify(data.tokens))
        localStorage.setItem(storageTs, Date.now().toString())
        addDebugInfo('Stored tokens in localStorage (' + storageKey + ')')
      } catch (e) {
        addDebugInfo('Error storing tokens: ' + e.message)
      }

      success.value = true
      title.value = 'Authentication Successful'
      message.value = 'Authentication successful. Redirecting you back...'

      setTimeout(() => {
        addDebugInfo('Redirecting to: ' + returnUrl)
        window.location.href = returnUrl
      }, 2000)
    }
  } catch (error) {
    console.error('Error during code exchange:', error)

    const searchParams = new URLSearchParams(window.location.search)
    const stateParam = searchParams.get('state')
    const provider = providerFromState(stateParam)
    const errorType = provider === 'microsoft' ? 'MICROSOFT_AUTH_ERROR' : 'GOOGLE_AUTH_ERROR'

    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        {
          type: errorType,
          error: error.message || 'Authentication failed during code exchange'
        },
        window.location.origin
      )
    }

    success.value = false
    title.value = 'Authentication Failed'
    message.value = error.message || 'An error occurred during authentication. Please try again later.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    console.log('%c AUTH CALLBACK PAGE LOADED ', 'background: #4CAF50; color: white; font-size: 20px;')

    addDebugInfo('Callback page loaded at ' + new Date().toISOString())
    addDebugInfo('URL: ' + window.location.href)

    const hashParams = parseHashParams()
    const searchParams = new URLSearchParams(window.location.search)

    addDebugInfo('Hash params: ' + JSON.stringify(hashParams))
    addDebugInfo('Search params: ' + JSON.stringify(Object.fromEntries(searchParams.entries())))

    if (hashParams.error) {
      addDebugInfo('ERROR in hash: ' + hashParams.error)
      throw new Error(
        `OAuth error in hash: ${hashParams.error}. Description: ${hashParams.error_description || 'No description'}`
      )
    }

    if (searchParams.has('error')) {
      addDebugInfo('ERROR in query: ' + searchParams.get('error'))
      throw new Error(
        `OAuth error in query: ${searchParams.get('error')}. Description: ${searchParams.get('error_description') || 'No description'}`
      )
    }

    addDebugInfo('Processing authentication callback')
    const accessToken = hashParams.access_token
    const idToken = hashParams.id_token
    const expiresIn = hashParams.expires_in || '3600'

    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')
    const provider = providerFromState(stateParam)

    if (code) {
      addDebugInfo('Found authorization code: ' + code.substring(0, 5) + '...')
      await handleCodeFlow(code, provider)
      return
    }

    if (!accessToken && !idToken) {
      addDebugInfo('No tokens or code found in response!')
      throw new Error('No tokens or authorization code found in the response')
    }

    const tokens = {
      access_token: accessToken,
      id_token: idToken,
      expires_in: parseInt(expiresIn, 10),
      token_type: hashParams.token_type || 'Bearer'
    }

    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        {
          type: 'GOOGLE_AUTH_SUCCESS',
          tokens
        },
        window.location.origin
      )

      success.value = true
      title.value = 'Authentication Successful'
      message.value = 'You have successfully authenticated with Google. This window will close automatically.'

      setTimeout(() => {
        window.close()
      }, 1500)
    } else {
      success.value = true
      title.value = 'Authentication Successful'
      message.value = 'Authentication successful. You can close this window.'
    }
  } catch (error) {
    console.error('Error processing authentication callback:', error)

    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        {
          type: 'GOOGLE_AUTH_ERROR',
          error: error.message || 'Authentication failed'
        },
        window.location.origin
      )
    }

    success.value = false
    title.value = 'Authentication Failed'
    message.value = error.message || 'An error occurred during authentication. Please try again later.'
  } finally {
    loading.value = false
  }
})
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
