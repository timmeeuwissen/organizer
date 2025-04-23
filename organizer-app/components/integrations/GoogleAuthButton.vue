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
    
    // Set all custom parameters in one call to avoid overwriting
    const customParams = {
      // This forces a refresh token to be returned
      access_type: 'offline',
      // This ensures we always get a refresh token (not just first time)
      prompt: 'consent'
    }
    
    // Add client ID if available from environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (clientId) {
      console.log('Using client ID from environment variables')
      customParams.client_id = clientId
    }
    
    // Apply all custom parameters at once
    provider.setCustomParameters(customParams)
    
    console.log('Setting Google auth parameters:', customParams)
    
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
    
    // Check for stsTokenManager which contains refresh token in newer Firebase versions
    const refreshToken = user.stsTokenManager?.refreshToken || credential.idToken
    console.log('Found refresh token?', !!refreshToken)
    
    // Create tokens object to match the format expected by parent components
    const tokens = {
      accessToken: credential.accessToken,
      refreshToken, // Use refresh token from Firebase auth
      userId: user.uid,
      email: user.email,
      provider: 'google',
      tokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
      idToken: credential.idToken || user.uid
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
