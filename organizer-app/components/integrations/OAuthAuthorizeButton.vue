<template lang="pug">
div
  v-btn(
    :color="color || 'primary'"
    :loading="isLoading"
    @click="handleAuthorize"
    :disabled="isLoading || disabled"
    :block="block"
    :size="size"
  )
    v-icon(start v-if="icon") {{ icon }}
    slot {{ text || $t('integrations.authorize') }}
  
  v-dialog(v-model="showTokenDialog" max-width="800px" scrollable persistent)
    v-card
      v-card-title 
        | {{ $t('settings.enterOAuthCredentials') }}
        v-spacer
        v-btn(icon @click="showTokenDialog = false")
          v-icon mdi-close
      
      v-card-text
        // STEP 1: Instructions
        v-card(variant="outlined" class="mb-4")
          v-card-title(class="text-subtitle-1 pb-0") 
            v-icon(color="primary" class="mr-2") mdi-numeric-1-circle
            | Run the OAuth Setup Command
          v-card-text
            p Run this command in your terminal to start the OAuth setup process:
            v-sheet(
              color="grey-lighten-4" 
              rounded
              class="pa-2 mb-2 font-monospace"
            ) 
              code {{ provider === 'google' ? 'make oauth-google-setup' : 'make oauth-ms-setup' }}
            p When completed, the script will output your credentials.
            
        // STEP 2: Credential Entry Fields
        v-card(variant="outlined" class="mb-4")
          v-card-title(class="text-subtitle-1 pb-0") 
            v-icon(color="primary" class="mr-2") mdi-numeric-2-circle
            | Enter the OAuth Credentials Below
          v-card-text
            p.text-body-2.text-grey-darken-1.mb-4 Copy and paste the credentials from the terminal output into these fields:
        
            v-text-field(
              v-model="clientId"
              label="Client ID"
              variant="outlined"
              required
              class="mb-3"
              placeholder="Example: 346724785-a8b7g4fd83g7h..."
              prepend-icon="mdi-key-variant"
              hint="The long ID string that identifies your application"
              persistent-hint
            )
            
            v-text-field(
              v-model="clientSecret"
              label="Client Secret"
              variant="outlined" 
              required
              class="mb-3"
              placeholder="Example: GOCSPX-hd83hd8ehd..."
              prepend-icon="mdi-key"
              hint="The secret value associated with your OAuth client"
              persistent-hint
            )
            
            v-text-field(
              v-model="refreshToken"
              label="Refresh Token"
              variant="outlined"
              required
              class="mb-3"
              placeholder="Example: 1//04g8FhGf7..."
              prepend-icon="mdi-refresh"
              hint="The long-lived token that allows refreshing access"
              persistent-hint
            )
        
        v-alert(v-if="!isFormValid" type="warning" class="mb-4" density="compact") 
          v-icon(start) mdi-alert
          | You must fill in all three credential fields to save
        
        v-alert(color="success" class="mb-4" density="compact" variant="tonal" v-if="isFormValid")
          v-icon(start color="success") mdi-check-circle
          | Ready to save! Click the Save button below to complete the integration.
      
      v-card-actions
        v-spacer
        v-btn(color="error" variant="text" @click="showTokenDialog = false") {{ $t('common.cancel') }}
        v-btn(color="primary" @click="saveTokens" :disabled="!isFormValid") {{ $t('common.save') }}
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  provider: {
    type: String,
    required: true,
    validator: (value) => ['google', 'microsoft', 'exchange'].includes(value)
  },
  color: {
    type: String,
    default: null
  },
  icon: {
    type: String,
    default: null
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
const emit = defineEmits(['authorize', 'tokens-updated'])

// State
const isLoading = ref(false)
const showTokenDialog = ref(false)
const clientId = ref('')
const clientSecret = ref('')
const refreshToken = ref('')

// Computed
const isFormValid = computed(() => {
  return clientId.value && clientSecret.value && refreshToken.value
})

// Methods
async function handleAuthorize() {
  isLoading.value = true
  
  try {
    // In a real implementation, this would open an OAuth window
    // For now, we'll just ask the user to enter the tokens manually
    
    emit('authorize')
    
    // Show the token dialog
    showTokenDialog.value = true
  } catch (error) {
    console.error('OAuth authorization error:', error)
  } finally {
    isLoading.value = false
  }
}

function saveTokens() {
  // Create tokens object
  const tokens = {
    clientId: clientId.value,
    clientSecret: clientSecret.value,
    refreshToken: refreshToken.value,
    accessToken: null, // Will be obtained through token refresh
    tokenExpiry: null, // Will be set when access token is obtained
    provider: props.provider,
  }
  
  // Emit tokens to parent
  emit('tokens-updated', tokens)
  
  // Reset form
  clientId.value = ''
  clientSecret.value = ''
  refreshToken.value = ''
  
  // Close dialog
  showTokenDialog.value = false
}
</script>
