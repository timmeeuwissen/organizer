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
import { ref } from 'vue'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

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

// Methods
async function handleGoogleAuth() {
  isLoading.value = true
  
  try {
    // Use Firebase Google authentication
    const auth = getAuth()
    const provider = new GoogleAuthProvider()
    
    // Set client ID if available from environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (clientId) {
      console.log('Using client ID from environment variables')
      provider.setCustomParameters({
        client_id: clientId
      })
    }
    
    // Add scopes for Google services we need access to
    // Gmail scopes - adding multiple scopes to ensure access
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly')
    provider.addScope('https://www.googleapis.com/auth/gmail.modify')
    provider.addScope('https://www.googleapis.com/auth/gmail.labels')
    provider.addScope('https://www.googleapis.com/auth/gmail.send')
    
    // Other service scopes
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly')
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly')
    provider.addScope('https://www.googleapis.com/auth/tasks.readonly')
    
    // Request access type for refresh token
    provider.setCustomParameters({
      // This forces a refresh token to be returned
      access_type: 'offline',
      // This ensures we always get a refresh token (not just first time)
      prompt: 'consent'
    })
    
    // Perform popup-based OAuth authentication
    const result = await signInWithPopup(auth, provider)
    
    // Extract relevant authentication information
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const user = result.user
    
    // Log auth data to see what we're getting
    console.log('Google auth result:', {
      credential,
      user,
      refreshToken: user.refreshToken || null,
      accessToken: credential.accessToken
    })
    
    // Google doesn't provide refresh tokens via Firebase popup auth
    // We need to directly interact with Google's OAuth endpoints with 'server-side' code
    
    // Create tokens object to match the format expected by parent components
    const tokens = {
      accessToken: credential.accessToken,
      refreshToken: user.refreshToken, // Use fixed token for debugging
      userId: user.uid,
      email: user.email,
      provider: 'google',
      tokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
      idToken: user.uid
    }
    
    // Log tokens being passed
    console.log('Emitting tokens:', tokens)
    
    // Emit success with tokens
    emit('auth-success', tokens)
  } catch (error) {
    console.error('Google popup authentication error:', error)
    emit('auth-error', error)
  } finally {
    isLoading.value = false
  }
}
</script>
