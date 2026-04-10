<template lang="pug">
div
  v-btn(
    :color="color || 'primary'"
    :loading="isLoading"
    @click="handleMicrosoftAuth"
    :disabled="isLoading || disabled"
    :block="block"
    :size="size"
  )
    v-icon(start v-if="icon") {{ icon }}
    slot {{ text || $t('settings.microsoftPopupAuth') }}
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { MICROSOFT_GRAPH_INTEGRATION_SCOPES } from '~/config/microsoftIntegrationOAuth'

const props = defineProps({
  color: { type: String, default: null },
  icon: { type: String, default: 'mdi-microsoft' },
  text: { type: String, default: null },
  block: { type: Boolean, default: false },
  size: { type: String, default: 'default' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['auth-success', 'auth-error'])

const isLoading = ref(false)
const authWindow = ref(null)
const messageListener = ref(null)

function decodeJwtPayload (jwt) {
  const part = jwt.split('.')[1]
  if (!part) { return {} }
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4)
  return JSON.parse(atob(padded))
}

onMounted(() => {
  try {
    const tokensJson = localStorage.getItem('microsoftAuth_tokens')
    const timestamp = localStorage.getItem('microsoftAuth_timestamp')

    if (tokensJson && timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10)
      if (tokenAge < 5 * 60 * 1000) {
        const tokenData = JSON.parse(tokensJson)
        const tokens = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          idToken: tokenData.id_token,
          tokenExpiry: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          userId: null,
          email: null,
          name: null,
          scope: tokenData.scope || null,
          provider: 'microsoft'
        }
        if (tokenData.id_token) {
          try {
            const payload = decodeJwtPayload(tokenData.id_token)
            tokens.userId = payload.oid || payload.sub
            tokens.email = payload.email || payload.preferred_username
            tokens.name = payload.name
          } catch (e) {
            console.error('[Microsoft Auth] Error parsing ID token from localStorage:', e)
          }
        }
        localStorage.removeItem('microsoftAuth_tokens')
        localStorage.removeItem('microsoftAuth_timestamp')
        emit('auth-success', tokens)
      } else {
        localStorage.removeItem('microsoftAuth_tokens')
        localStorage.removeItem('microsoftAuth_timestamp')
      }
    }
  } catch (e) {
    console.error('[Microsoft Auth] Error processing stored tokens:', e)
  }
})

onBeforeUnmount(() => {
  if (messageListener.value) {
    window.removeEventListener('message', messageListener.value)
  }
  if (authWindow.value) {
    try {
      authWindow.value.close()
    } catch (e) {
      console.error('Error closing auth window:', e)
    }
  }
})

function handleMicrosoftAuth () {
  isLoading.value = true

  try {
    const runtimeConfig = useRuntimeConfig()
    const clientId = runtimeConfig.public.microsoft?.clientId
    const tenantId = runtimeConfig.public.microsoft?.tenantId || 'common'

    if (!clientId) {
      throw new Error('Microsoft OAuth is not configured (missing public client ID).')
    }

    if (messageListener.value) {
      window.removeEventListener('message', messageListener.value)
    }

    messageListener.value = (event) => {
      if (event.origin !== window.location.origin) { return }
      const { data } = event
      if (!data.type || (data.source && data.source.includes('devtools'))) { return }

      if (data.type === 'MICROSOFT_AUTH_SUCCESS') {
        const tokenData = data.tokens
        const tokens = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          idToken: tokenData.id_token,
          tokenExpiry: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          userId: null,
          email: null,
          name: null,
          scope: tokenData.scope || null,
          provider: 'microsoft'
        }
        if (tokenData.id_token) {
          try {
            const payload = decodeJwtPayload(tokenData.id_token)
            tokens.userId = payload.oid || payload.sub
            tokens.email = payload.email || payload.preferred_username
            tokens.name = payload.name
          } catch (e) {
            console.error('[Microsoft Auth] Error parsing ID token:', e)
          }
        }
        emit('auth-success', tokens)
        isLoading.value = false
      } else if (data.type === 'MICROSOFT_AUTH_ERROR') {
        emit('auth-error', new Error(data.error))
        isLoading.value = false
      }
    }

    window.addEventListener('message', messageListener.value)

    const redirectUri = `${window.location.origin}/auth/callback`
    const scope = encodeURIComponent(MICROSOFT_GRAPH_INTEGRATION_SCOPES)
    const state = encodeURIComponent(
      JSON.stringify({
        provider: 'microsoft',
        timestamp: Date.now(),
        origin: window.location.origin
      })
    )

    const authBase = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`
    const url =
      `${authBase}?client_id=${encodeURIComponent(clientId)}` +
      '&response_type=code' +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_mode=query' +
      `&scope=${scope}` +
      `&state=${state}` +
      '&prompt=consent'

    const config = useRuntimeConfig()
    if (config.public.debugAuthRedirect === 'true') {
      window.location.href = url
      return
    }

    const width = 800
    const height = 800
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    authWindow.value = window.open(
      url,
      'Microsoft Authentication',
      `width=${width},height=${height},left=${left},top=${top},toolbar=1,scrollbars=1,status=1,resizable=1,location=1,menuBar=1`
    )

    if (!authWindow.value || authWindow.value.closed || typeof authWindow.value.closed === 'undefined') {
      isLoading.value = false
      throw new Error('Popup blocked! Please allow popups for this site.')
    }

    authWindow.value.focus()

    setTimeout(() => {
      if (isLoading.value) {
        console.error('[Microsoft Auth] Auth timeout after 30s')
        isLoading.value = false
        try {
          if (authWindow.value && !authWindow.value.closed) {
            authWindow.value.close()
          }
        } catch (e) {
          console.error('[Microsoft Auth] Error closing timed out window:', e)
        }
        emit('auth-error', new Error('Authentication timed out after 30 seconds'))
      }
    }, 30000)
  } catch (error) {
    console.error('[Microsoft Auth] Error:', error)
    emit('auth-error', error)
    isLoading.value = false
  }
}
</script>
