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
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly')
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly')
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly')
    provider.addScope('https://www.googleapis.com/auth/tasks.readonly')
    
    // Perform popup-based OAuth authentication
    const result = await signInWithPopup(auth, provider)
    
    // Extract relevant authentication information
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const user = result.user
    
    // Create tokens object to match the format expected by parent components
    const tokens = {
      accessToken: credential.accessToken,
      refreshToken: user.refreshToken || null, // Note: Firebase might not always return a refresh token
      userId: user.uid,
      email: user.email,
      provider: 'google',
      tokenExpiry: null, // Firebase handles token refresh automatically
      idToken: user.uid
    }
    
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
