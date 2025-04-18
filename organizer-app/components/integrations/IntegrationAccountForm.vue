<template lang="pug">
v-form(ref="form" v-model="formValid")
  v-row
    // Display provider account info
    v-col(cols="12" v-if="isConnected")
      v-alert(type="info" variant="tonal" class="mb-4")
        div.text-subtitle-1.mb-1 {{ name || $t('settings.provider.info') }}
        div {{ email }}
        v-chip(
          :color="isConnected ? 'success' : 'error'"
          size="small"
          class="mt-2"
          density="comfortable"
        ) {{ isConnected ? $t('settings.connected') : $t('settings.disconnected') }}
        div.text-caption.mt-2(v-if="lastSync") {{ $t('settings.lastSync') }}: {{ formatDate(lastSync) }}

    // Account type selection (only for new accounts)
    v-col(cols="12" v-if="!isConnected")
      v-select(
        v-model="accountType"
        :items="accountTypes"
        :label="$t('settings.accountType')"
        item-title="text" 
        item-value="value"
        prepend-icon="mdi-account"
        :rules="[rules.required]"
        :disabled="isConnected || isLoading"
      )
    
    // Server field for Exchange accounts
    v-col(cols="12" v-if="accountType === 'exchange' && !useOAuth && !isConnected")
      v-text-field(
        v-model="server"
        :label="$t('settings.integrationServer')"
        prepend-icon="mdi-server"
        :rules="[rules.required]"
        :disabled="isConnected || isLoading"
        placeholder="outlook.office365.com"
      )
    
    // OAuth switch for Exchange
    v-col(cols="12" v-if="accountType === 'exchange' && server && !isConnected")
      v-switch(
        v-model="useOAuth"
        :label="$t('settings.useOAuth')"
        color="primary"
        :disabled="isConnected || isLoading"
        :hint="server && server.includes('office365') ? $t('settings.office365OAuthRecommended') : ''"
        persistent-hint
      )
    
    // Basic Auth section - only visible when creating new non-OAuth accounts
    template(v-if="!useOAuth && !isConnected")
      v-col(cols="12")
        v-text-field(
          v-model="username"
          :label="$t('settings.integrationUsername')"
          prepend-icon="mdi-account"
          :rules="[rules.required]"
          :disabled="isConnected || isLoading"
          :placeholder="usernameHint"
        )
      
      v-col(cols="12")
        v-text-field(
          v-model="password"
          :label="$t('settings.integrationPassword')"
          prepend-icon="mdi-lock"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="showPassword ? 'text' : 'password'"
          :rules="[rules.required]"
          :disabled="isLoading"
          @click:append="showPassword = !showPassword"
        )
    
    // OAuth section - only visible when creating new accounts
    template(v-if="useOAuth && !isConnected")
      v-col(cols="12")
        // Google-specific options
        template(v-if="accountType === 'google'")
          v-card(variant="outlined" class="pa-3 mb-3")
            v-card-title(class="px-0 text-subtitle-1") 
              v-icon(color="info" class="mr-2") mdi-google
              | {{ $t('settings.authOptions') }}
            
            v-card-text(class="px-0")
              v-row
                v-col(cols="12")
                  v-divider(class="mb-4")
                
                // Google Popup Auth Button
                v-col(cols="12" md="6" class="d-flex align-center justify-center flex-column")
                  google-auth-button(
                    color="error"
                    :text="$t('settings.googlePopupAuth')"
                    block
                    @auth-success="handleGoogleAuthSuccess"
                    @auth-error="handleGoogleAuthError"
                  )
                
                v-col(cols="12" class="d-flex align-items-center justify-center my-2")
                  v-divider(class="mx-4")
                  span.text-overline {{ $t('common.or').toUpperCase() }}
                  v-divider(class="mx-4")
                
                // Manual OAuth option
                v-col(cols="12" md="6" class="d-flex align-center justify-center flex-column")
                  o-auth-authorize-button(
                    :provider="getOAuthProvider"
                    :color="isOAuthConfigured ? 'success' : 'primary'"
                    :text="isOAuthConfigured ? $t('settings.oauthConfigured') : $t('settings.manualOAuth')"
                    :icon="isOAuthConfigured ? 'mdi-check' : 'mdi-key'"
                    block
                    @tokens-updated="handleTokensUpdated"
                  )

        // Other OAuth providers
        template(v-else)
          v-card(variant="outlined" class="pa-3 mb-3")
            v-card-title(class="px-0 text-subtitle-1") 
              v-icon(color="info" class="mr-2") mdi-information-outline
              | {{ $t('settings.oauthInstructions') }}
            
            v-card-text(class="px-0")
              p {{ $t('settings.runMakeCommand') }}:
              v-sheet(
                color="grey-lighten-4" 
                rounded
                class="pa-2 mb-3 font-monospace"
              ) {{ `make oauth-${accountType === 'office365' || (accountType === 'exchange' && server?.includes('office365')) ? 'ms' : accountType}-setup` }}
              
              v-expansion-panels(variant="accordion")
                v-expansion-panel(title="View Detailed Instructions")
                  v-expansion-panel-text
                    ol
                      li {{ $t('settings.oauthStep1') }}
                      li {{ $t('settings.oauthStep2') }}
                      li {{ $t('settings.oauthStep3') }}
                      li {{ $t('settings.oauthStep4') }}
            v-card-actions(class="px-0")
              v-spacer  
              o-auth-authorize-button(
                :provider="getOAuthProvider"
                :color="isOAuthConfigured ? 'success' : 'primary'"
                :text="isOAuthConfigured ? $t('settings.oauthConfigured') : $t('settings.enterOAuthCredentials')"
                :icon="isOAuthConfigured ? 'mdi-check' : 'mdi-key'"
                @tokens-updated="handleTokensUpdated"
              )
    
    v-col(cols="12")
      v-divider
      
    v-col(cols="12")
      span {{ $t('settings.syncSettings') }}
    
    v-col(cols="6")
      v-switch(
        v-model="syncCalendar"
        :label="$t('settings.syncCalendar')"
        color="primary"
        :disabled="isLoading"
      )
    
    v-col(cols="6")
      v-switch(
        v-model="showInCalendar"
        :label="$t('settings.showInCalendar')"
        color="primary"
        :disabled="isLoading || !syncCalendar"
      )
    
    v-col(cols="6")
      v-switch(
        v-model="syncMail"
        :label="$t('settings.syncMail')"
        color="primary"
        :disabled="isLoading"
      )
    
    v-col(cols="6")
      v-switch(
        v-model="showInMail"
        :label="$t('settings.showInMail')"
        color="primary"
        :disabled="isLoading || !syncMail"
      )
    
    v-col(cols="6")
      v-switch(
        v-model="syncTasks"
        :label="$t('settings.syncTasks')"
        color="primary"
        :disabled="isLoading"
      )
    
    v-col(cols="6")
      v-switch(
        v-model="showInTasks"
        :label="$t('settings.showInTasks')"
        color="primary"
        :disabled="isLoading || !syncTasks"
      )
    
    v-col(cols="6")
      v-switch(
        v-model="syncContacts"
        :label="$t('settings.syncContacts')"
        color="primary"
        :disabled="isLoading"
      )
    
    v-col(cols="6")
      v-switch(
        v-model="showInContacts"
        :label="$t('settings.showInContacts')"
        color="primary"
        :disabled="isLoading || !syncContacts"
      )
    
    v-col(cols="12")
      v-color-picker(
        v-model="color"
        :swatches="colorSwatches"
        show-swatches
        hide-inputs
        hide-canvas
        dot-size="25"
      )
  
  v-row(class="mt-4 mb-4")
    template(v-if="!isConnected")
      v-col(cols="12")
        v-btn(
          color="primary"
          block
          :loading="isLoading"
          :disabled="!formValid || isLoading"
          @click="testConnection"
        ) 
          v-icon(start) mdi-connection
          | {{ $t('settings.testConnection') }}
    
    template(v-else)
      v-col(cols="12" sm="6")
        v-btn(
          color="info"
          block
          :loading="isSyncing"
          :disabled="isSyncing"
          @click="syncAccount"
        )
          v-icon(start) mdi-sync
          | {{ $t('settings.syncNow') }}
      
      v-col(cols="12" sm="6")
        v-btn(
          color="error"
          block
          :loading="isLoading"
          :disabled="isLoading"
          @click="disconnectAccount"
        ) 
          v-icon(start) mdi-link-off
          | {{ $t('settings.disconnectAccount') }}
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { v4 as uuidv4 } from 'uuid'
import OAuthAuthorizeButton from './OAuthAuthorizeButton.vue'
import GoogleAuthButton from './GoogleAuthButton.vue'

// Props
const props = defineProps({
  account: {
    type: Object,
    default: null
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['save', 'test', 'sync', 'disconnect', 'update:account'])

// State
const form = ref(null)
const formValid = ref(false)
const showPassword = ref(false)
const isSyncing = ref(false)
const isLoading = ref(false)

// Properties for display 
const name = ref('')
const email = ref('')
const isConnected = ref(false)
const lastSync = ref(null)

// Form fields
const accountType = ref('google')
const server = ref('')
const username = ref('')
const password = ref('')
const useOAuth = ref(true) // Default to OAuth for Google and Office 365
const syncCalendar = ref(true)
const syncMail = ref(true)
const syncTasks = ref(true)
const syncContacts = ref(true)
const showInCalendar = ref(true)
const showInMail = ref(true)
const showInTasks = ref(true)
const showInContacts = ref(true)
const color = ref('#1976D2') // Default blue

// OAuth-related fields
const clientId = ref('')
const clientSecret = ref('')
const refreshToken = ref('')
const accessToken = ref('')
const tokenExpiry = ref(null)
const oauthScope = ref('')

// Validation rules
const rules = {
  required: (v) => !!v || 'This field is required',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail must be valid'
}

// Composables
const i18n = useI18n()
const networkStatus = useNetworkStatus()

// Account type options
const accountTypes = [
  { text: i18n.t('settings.google'), value: 'google' },
  { text: i18n.t('settings.exchange'), value: 'exchange' },
  { text: i18n.t('settings.office365'), value: 'office365' }
]

// Color swatches for accounts
const colorSwatches = [
  ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
  ['#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39'],
  ['#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B']
]

// Computed
const usernameHint = computed(() => {
  switch (accountType.value) {
    case 'google':
      return 'user@gmail.com'
    case 'exchange':
    case 'office365':
      return 'domain\\username'
    default:
      return 'username'
  }
})

// Get the OAuth provider based on account type
const getOAuthProvider = computed(() => {
  if (accountType.value === 'office365') {
    return 'microsoft'
  } else if (accountType.value === 'exchange' && server.value?.includes('office365')) {
    return 'microsoft'
  } else {
    return accountType.value
  }
})

// Check if OAuth is already configured
const isOAuthConfigured = computed(() => {
  return !!clientId.value && !!clientSecret.value && !!refreshToken.value
})

// Handle Google auth success from popup
function handleGoogleAuthSuccess(tokens) {
  console.log('Google popup auth success:', tokens)
  
  // Set local state values for OAuth data
  accessToken.value = tokens.accessToken
  
  // Capture the refresh token - this is critical for reconnecting later
  if (tokens.refreshToken) {
    console.log('Refresh token received from Google auth, storing it...')
    refreshToken.value = tokens.refreshToken
    
    // Store scopes as well
    oauthScope.value = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/gmail.send'
    ].join(' ')
  } else {
    console.warn('⚠️ No refresh token provided from Google auth popup. This will prevent reconnecting in the future.')
    // Log more details for debugging
    console.log('Token details:', {
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      email: tokens.email
    })
  }
  
  // Set display info from the provider
  name.value = tokens.displayName || 'Google Account'
  email.value = tokens.email || ''
  isConnected.value = true
  lastSync.value = new Date()
  
  // Emit success with the updated account data
  emit('test', getAccountData())
}

// Handle Google auth error from popup
function handleGoogleAuthError(error) {
  console.error('Google popup auth error:', error)
  // No specific handling needed - the button component will show its own error state
}

// Load account data if present
watch(() => props.account, () => {
  if (props.account) {
    accountType.value = props.account.type || 'google'
    server.value = props.account.server || ''
    
    // Load sync settings
    syncCalendar.value = props.account.syncCalendar ?? true
    syncMail.value = props.account.syncMail ?? true
    syncTasks.value = props.account.syncTasks ?? true
    syncContacts.value = props.account.syncContacts ?? true
    showInCalendar.value = props.account.showInCalendar ?? true
    showInMail.value = props.account.showInMail ?? true
    showInTasks.value = props.account.showInTasks ?? true
    showInContacts.value = props.account.showInContacts ?? true
    color.value = props.account.color || '#1976D2'
    
    // Handle OAuth data if available
    if (props.account.oauthData) {
      name.value = props.account.oauthData.name || ''
      email.value = props.account.oauthData.email || ''
      isConnected.value = props.account.oauthData.connected || false
      lastSync.value = props.account.oauthData.lastSync || null
      
      // OAuth credentials
      clientId.value = props.account.oauthData.clientId || ''
      clientSecret.value = props.account.oauthData.clientSecret || ''
      refreshToken.value = props.account.oauthData.refreshToken || ''
      accessToken.value = props.account.oauthData.accessToken || ''
      tokenExpiry.value = props.account.oauthData.tokenExpiry || null
      oauthScope.value = props.account.oauthData.scope || ''
    } else {
      // Backward compatibility
      name.value = props.account.name || ''
      email.value = props.account.email || ''
      isConnected.value = props.account.connected || false
      lastSync.value = props.account.lastSync || null
      
      clientId.value = props.account.clientId || ''
      clientSecret.value = props.account.clientSecret || ''
      refreshToken.value = props.account.refreshToken || ''
      accessToken.value = props.account.accessToken || ''
      tokenExpiry.value = props.account.tokenExpiry || null
      oauthScope.value = props.account.scope || ''
    }
    
    // Set OAuth switch based on account type and available tokens
    useOAuth.value = 
      accountType.value === 'google' || 
      accountType.value === 'office365' || 
      (accountType.value === 'exchange' && server.value?.includes('office365')) ||
      (!!clientId.value && !!refreshToken.value)
  }
}, { immediate: true })

// Handle tokens updated from OAuth button
function handleTokensUpdated(tokens) {
  console.log('OAuth tokens updated:', tokens)
  
  // Update local state
  clientId.value = tokens.clientId
  clientSecret.value = tokens.clientSecret
  refreshToken.value = tokens.refreshToken
  
  // Set provider info
  name.value = name.value || `${accountType.value} Account`
  isConnected.value = true
  lastSync.value = new Date()
  
  // Emit success with updated account data
  emit('test', getAccountData())
}

// Methods
function getAccountData() {
  // Helper to remove undefined values to prevent Firestore errors
  const removeUndefined = (obj) => {
    const result = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    });
    return result;
  };

  // Prepare OAuth data
  const oAuthData = {
    name: name.value || `${accountType.value} Account`,
    email: email.value || '',
    connected: isConnected.value,
    lastSync: lastSync.value,
    refreshToken: refreshToken.value,
    accessToken: accessToken.value,
    tokenExpiry: tokenExpiry.value,
    clientId: clientId.value,
    clientSecret: clientSecret.value,
    scope: oauthScope.value
  };

  // Create a new account object with the new structure
  const now = new Date();
  const baseAccountData = {
    id: props.account?.id || uuidv4(),
    type: accountType.value,
    syncCalendar: syncCalendar.value,
    syncMail: syncMail.value,
    syncTasks: syncTasks.value,
    syncContacts: syncContacts.value,
    showInCalendar: showInCalendar.value && syncCalendar.value,
    showInMail: showInMail.value && syncMail.value,
    showInTasks: showInTasks.value && syncTasks.value,
    showInContacts: showInContacts.value && syncContacts.value,
    color: color.value,
    createdAt: props.account?.createdAt || now,
    updatedAt: now,
    oauthData: removeUndefined(oAuthData)
  };
  
  // Add optional server field for Exchange accounts
  if (accountType.value === 'exchange' && server.value) {
    baseAccountData.server = server.value;
  }
  
  return removeUndefined(baseAccountData);
}

async function testConnection() {
  if (!formValid.value || !networkStatus.isOnline.value) {
    return
  }
  
  isLoading.value = true
  
  try {
    // Different auth flow based on account type
    if (accountType.value === 'google') {
      // Start OAuth flow for Google
      await initiateGoogleOAuth()
    } else if (accountType.value === 'office365') {
      // Start OAuth flow for Office 365
      await initiateOffice365OAuth()
    } else if (accountType.value === 'exchange') {
      // Exchange can use basic auth or OAuth, depending on the server
      if (server.value && server.value.includes('office365')) {
        await initiateOffice365OAuth()
      } else {
        // Simple connection test for regular Exchange servers
        await new Promise(resolve => setTimeout(resolve, 1500))
        emit('test', getAccountData())
      }
    }
  } catch (err) {
    console.error('Error testing connection:', err)
  } finally {
    isLoading.value = false
  }
}

// OAuth implementation for Google
async function initiateGoogleOAuth() {
  try {
    // In a real app, this would:
    // 1. Open a popup window to Google's OAuth consent screen
    // 2. User would grant permissions
    // 3. Google would redirect to your callback URL with an auth code
    // 4. You'd exchange the auth code for tokens
    
    console.log('Initiating Google OAuth flow...')
    
    // For now, we'll simulate a successful authentication
    const mockSuccessfulAuth = await new Promise(resolve => {
      setTimeout(() => {
        resolve({
          accessToken: 'google-mock-access-token-' + Date.now(),
          refreshToken: 'google-mock-refresh-token-' + Date.now(),
          expiresIn: 3600,
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
          name: 'Google Account',
          email: email.value || 'user@gmail.com'
        })
      }, 2000)
    })
    
    // Set local state with OAuth data
    accessToken.value = mockSuccessfulAuth.accessToken;
    refreshToken.value = mockSuccessfulAuth.refreshToken;
    tokenExpiry.value = new Date(Date.now() + (mockSuccessfulAuth.expiresIn * 1000));
    oauthScope.value = mockSuccessfulAuth.scope;
    name.value = mockSuccessfulAuth.name;
    email.value = mockSuccessfulAuth.email;
    isConnected.value = true;
    lastSync.value = new Date();
    
    // Emit success with updated account data
    emit('test', getAccountData())
  } catch (error) {
    console.error('Google OAuth error:', error)
    throw error
  }
}

// OAuth implementation for Office 365
async function initiateOffice365OAuth() {
  try {
    // In a real app, this would:
    // 1. Open a popup window to Microsoft's OAuth consent screen
    // 2. User would grant permissions
    // 3. Microsoft would redirect to your callback URL with an auth code
    // 4. You'd exchange the auth code for tokens
    
    console.log('Initiating Office 365 OAuth flow...')
    
    // For now, we'll simulate a successful authentication
    const mockSuccessfulAuth = await new Promise(resolve => {
      setTimeout(() => {
        resolve({
          accessToken: 'ms-mock-access-token-' + Date.now(),
          refreshToken: 'ms-mock-refresh-token-' + Date.now(),
          expiresIn: 3600,
          scope: 'Mail.Read User.Read',
          name: 'Microsoft Account',
          email: email.value || 'user@outlook.com'
        })
      }, 2000)
    })
    
    // Set local state with OAuth data
    accessToken.value = mockSuccessfulAuth.accessToken;
    refreshToken.value = mockSuccessfulAuth.refreshToken;
    tokenExpiry.value = new Date(Date.now() + (mockSuccessfulAuth.expiresIn * 1000));
    oauthScope.value = mockSuccessfulAuth.scope;
    name.value = mockSuccessfulAuth.name;
    email.value = mockSuccessfulAuth.email;
    isConnected.value = true;
    lastSync.value = new Date();
    
    // Emit success with updated account data
    emit('test', getAccountData())
  } catch (error) {
    console.error('Microsoft OAuth error:', error)
    throw error
  }
}

async function connectAccount() {
  if (!formValid.value || !networkStatus.isOnline.value) {
    return
  }
  
  isLoading.value = true
  
  try {
    // Mock a connection
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    isConnected.value = true
    lastSync.value = new Date()
    
    // Emit save event with account data
    emit('save', getAccountData())
  } catch (err) {
    console.error('Error connecting account:', err)
  } finally {
    isLoading.value = false
  }
}

async function disconnectAccount() {
  if (!networkStatus.isOnline.value) {
    return
  }
  
  isLoading.value = true
  
  try {
    // Mock a disconnection
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    isConnected.value = false
    lastSync.value = null
    password.value = ''
    
    // Emit disconnect event with account data
    emit('disconnect', getAccountData())
  } catch (err) {
    console.error('Error disconnecting account:', err)
  } finally {
    isLoading.value = false
  }
}

async function syncAccount() {
  if (!isConnected.value || !networkStatus.isOnline.value) {
    return
  }
  
  isSyncing.value = true
  
  try {
    // Mock a sync operation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    lastSync.value = new Date()
    
    // Emit sync event with account data
    emit('sync', getAccountData())
  } catch (err) {
    console.error('Error syncing account:', err)
  } finally {
    isSyncing.value = false
  }
}

// Helper function to format dates
function formatDate(date) {
  if (!date) return ''
  
  const d = new Date(date)
  return d.toLocaleString()
}

// Watch for form changes to update the parent component
watch([accountType, email, server, username, syncCalendar, syncMail, syncTasks, syncContacts, 
       showInCalendar, showInMail, showInTasks, showInContacts, color, isConnected, 
       name, lastSync, accessToken, refreshToken, clientId, clientSecret], () => {
  emit('update:account', getAccountData())
}, { deep: true })
</script>
