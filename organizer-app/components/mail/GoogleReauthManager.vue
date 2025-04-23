<template lang="pug">
ReauthorizeGoogleDialog(
  v-if="needsReauth && currentAccount"
  ref="reauthDialog"
  :account="currentAccount"
  @auth-success="handleAuthSuccess"
  @auth-error="handleAuthError"
)
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useMailStore } from '~/stores/mail'
import { accountsNeedingReauth, clearReauthorizationStatus } from '~/utils/api/mailProviders/googleAuthUtils'
import ReauthorizeGoogleDialog from '~/components/integrations/ReauthorizeGoogleDialog.vue'

// Component state
const reauthDialog = ref(null)
const currentAccount = ref(null)

// Stores
const authStore = useAuthStore()
const mailStore = useMailStore()

// Computed properties
const connectedAccounts = computed(() => mailStore.getConnectedAccounts)
const needsReauth = computed(() => {
  // Check if any connected account needs reauthorization
  for (const account of connectedAccounts.value) {
    if (account.type === 'google' && 
        accountsNeedingReauth.value[account.id]) {
      currentAccount.value = account
      return true
    }
  }
  return false
})

// Watch for changes in accounts needing reauth
watch(needsReauth, (value) => {
  if (value && reauthDialog.value) {
    console.log('Opening reauth dialog for', currentAccount.value.oauthData.email)
    reauthDialog.value.open()
  }
})

// Check for accounts needing reauth on mount
onMounted(() => {
  if (needsReauth.value && reauthDialog.value) {
    console.log('Opening reauth dialog on mount for', currentAccount.value.oauthData.email)
    reauthDialog.value.open()
  }
})

// Handle successful reauthorization
function handleAuthSuccess(tokens) {
  if (!currentAccount.value) return
  
  console.log('Google reauthorization successful for', currentAccount.value.oauthData.email)
  
  // Update the account with new tokens
  const updatedAccount = {
    ...currentAccount.value,
    oauthData: {
      ...currentAccount.value.oauthData,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      connected: true,
      updatedAt: new Date(),
      // If tokens.tokenExpiry is provided, use it; otherwise, set a default expiry (1 hour)
      tokenExpiry: tokens.tokenExpiry || new Date(Date.now() + 3600 * 1000)
    }
  }
  
  // Save the updated account to the auth store
  if (authStore.currentUser && authStore.currentUser.settings) {
    const accounts = [...(authStore.currentUser.settings.integrationAccounts || [])]
    const accountIndex = accounts.findIndex(acc => acc.id === currentAccount.value?.id)
    
    if (accountIndex >= 0) {
      // Update the account
      accounts[accountIndex] = updatedAccount
      
      // Update the user settings
      authStore.updateUserSettings({
        ...authStore.currentUser.settings,
        integrationAccounts: accounts
      })
      
      // Clear reauthorization status
      clearReauthorizationStatus(currentAccount.value)
      
      // Reset current account
      currentAccount.value = null
      
      // Refresh the mail data
      mailStore.fetchEmails()
    }
  }
}

// Handle reauthorization error
function handleAuthError(error) {
  console.error('Google reauthorization error:', error)
  // Could show a notification here
}
</script>
