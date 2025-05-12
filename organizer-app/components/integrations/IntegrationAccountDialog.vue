<template lang="pug">
v-dialog(
  v-model="dialogVisible"
  max-width="500px"
  persistent
)
  v-card
    v-card-title
      span {{ $t('settings.connectIntegration') }}
      v-spacer
      v-btn(icon @click="close")
        v-icon mdi-close
    
    v-alert(
      v-if="errorMsg" 
      type="error" 
      class="ma-4"
      style="position: relative; z-index: 5; width: 100%;"
      closable
      @click:close="errorMsg = ''"
    ) {{ errorMsg }}
    
    v-alert(
      v-if="successMsg" 
      type="success" 
      class="ma-4"
      style="position: relative; z-index: 5; width: 100%;"
      closable
      @click:close="successMsg = ''"
    ) {{ successMsg }}
    
    v-card-text
      v-row(align="center" justify="center")
        v-col(cols="12" class="text-center")
          h3.mb-4 {{ $t('settings.selectAuthMethod') }}
          
          // Google auth using the GoogleAuthButton component
          v-col(cols="12" md="6" class="d-flex align-center justify-center my-3")
            google-auth-button(
              color="error"
              :text="$t('settings.connectGoogle')"
              block
              @click="handleGoogleAuthClick"
              @auth-success="handleGoogleAuthSuccess"
              @auth-error="handleGoogleAuthError"
              :loading="isGoogleLoading"
            )
          
          // Microsoft auth
          v-col(cols="12" md="6" class="d-flex align-center justify-center my-3")
            o-auth-authorize-button(
              provider="microsoft"
              color="info"
              :text="$t('settings.connectMicrosoft')"
              :icon="'mdi-microsoft'"
              block
              @authorize="handleMicrosoftAuthClick"
              @tokens-updated="handleMicrosoftAuthSuccess"
              :loading="isMicrosoftLoading"
            )
    
    v-card-actions
      v-spacer
      v-btn(color="error" variant="text" @click="close") {{ $t('common.cancel') }}
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '~/stores/notification'
import { useAuthStore } from '~/stores/auth'
import IntegrationAccountForm from './IntegrationAccountForm.vue'
import GoogleAuthButton from './GoogleAuthButton'
import OAuthAuthorizeButton from './OAuthAuthorizeButton'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  account: {
    type: Object,
    default: null
  },
  addOnly: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'save', 'test'])

// State
const dialogVisible = ref(false)
const formData = ref(null)          // Basic account data
const oauthData = ref(null)         // OAuth-related data (tokens, etc.)
const originalFormData = ref(null)  // Original form data for comparison
const accountForm = ref(null)
const errorMsg = ref('')
const successMsg = ref('')
const isSaving = ref(false)

// Composables
const i18n = useI18n()
const notificationStore = useNotificationStore()

// State for auth providers
const isGoogleLoading = ref(false);
const isMicrosoftLoading = ref(false);

// Functions for handling auth results from components
function handleGoogleAuthClick() {
  // Close dialog immediately after button click
  dialogVisible.value = false;
  
  // Show notification that authentication is in progress
  notificationStore.info(i18n.t('settings.authenticatingWithGoogle') || 'Authenticating with Google...', {
    timeout: 10000 // longer timeout since auth might take time
  });
}

// Get authStore
const authStore = useAuthStore();

async function handleGoogleAuthSuccess(tokens) {
  console.log('Google auth success:', tokens);
  
  try {
    // Create account with tokens from Google
    const now = new Date();
    const account = {
      id: uuidv4(),
      type: 'google',
      color: '#DB4437', // Google red
      syncCalendar: true,
      syncMail: true,
      syncTasks: true,
      syncContacts: true,
      showInCalendar: true,
      showInMail: true,
      showInTasks: true,
      showInContacts: true,
      createdAt: now,
      updatedAt: now,
      oauthData: {
        name: tokens.displayName || 'Google Account',
        email: tokens.email || '',
        connected: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.tokenExpiry,
        clientId: tokens.clientId,
        lastSync: new Date()
      }
    };
    
    // Check if user is authenticated and has settings
    if (!authStore.isAuthenticated || !authStore.currentUser) {
      console.error('Cannot add integration account: User not authenticated');
      throw new Error('User not authenticated');
    }
    
    // Get current integration accounts
    const currentAccounts = [...(authStore.currentUser.settings?.integrationAccounts || [])];
    
    // Check if account with the same email already exists
    const existingAccountIndex = currentAccounts.findIndex(
      acc => acc.oauthData?.email === account.oauthData.email
    );
    
    if (existingAccountIndex >= 0) {
      // Replace existing account with the same email
      console.log('Updating existing account with same email:', account.oauthData.email);
      currentAccounts[existingAccountIndex] = account;
    } else {
      // Add new account
      console.log('Adding new integration account:', account.oauthData.email);
      currentAccounts.push(account);
    }
    
    // Update user settings with the new/updated integration account
    await authStore.updateUserSettings({
      integrationAccounts: currentAccounts
    });
    
    console.log(`Successfully ${existingAccountIndex >= 0 ? 'updated' : 'added'} Google account to user settings`);
    console.log('Updated integration accounts count:', currentAccounts.length);
    
    // Show success notification
    notificationStore.success(i18n.t('settings.connectionSuccessful') || 'Successfully connected to Google');
    
    // Still emit the save event for any parent components that need to know
    emit('save', account);
  }
  catch (error) {
    console.error('Error processing Google auth:', error);
    notificationStore.error(error.message || 'Failed to process Google authentication');
  }
}

function handleGoogleAuthError(error) {
  console.error('Google auth error:', error);
  notificationStore.error(error.message || 'Failed to connect to Google');
}

function handleMicrosoftAuthClick() {
  // Close dialog immediately after button click
  dialogVisible.value = false;
  
  // Show notification that authentication is in progress
  notificationStore.info(i18n.t('settings.authenticatingWithMicrosoft') || 'Authenticating with Microsoft...', {
    timeout: 10000 // longer timeout since auth might take time
  });
}

async function handleMicrosoftAuthSuccess(tokens) {
  console.log('Microsoft auth success:', tokens);
  
  try {
    // Create account with tokens from Microsoft
    const now = new Date();
    const account = {
      id: uuidv4(),
      type: 'office365',
      color: '#0078D4', // Microsoft blue
      syncCalendar: true,
      syncMail: true,
      syncTasks: true,
      syncContacts: true,
      showInCalendar: true,
      showInMail: true,
      showInTasks: true,
      showInContacts: true,
      createdAt: now,
      updatedAt: now,
      oauthData: {
        name: 'Microsoft Account',
        email: tokens.email || 'user@outlook.com',
        connected: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.tokenExpiry,
        clientId: tokens.clientId,
        clientSecret: tokens.clientSecret,
        lastSync: new Date()
      }
    };
    
    // Check if user is authenticated and has settings
    if (!authStore.isAuthenticated || !authStore.currentUser) {
      console.error('Cannot add integration account: User not authenticated');
      throw new Error('User not authenticated');
    }
    
    // Get current integration accounts
    const currentAccounts = [...(authStore.currentUser.settings?.integrationAccounts || [])];
    
    // Check if account with the same email already exists
    const existingAccountIndex = currentAccounts.findIndex(
      acc => acc.oauthData?.email === account.oauthData.email
    );
    
    if (existingAccountIndex >= 0) {
      // Replace existing account with the same email
      console.log('Updating existing account with same email:', account.oauthData.email);
      currentAccounts[existingAccountIndex] = account;
    } else {
      // Add new account
      console.log('Adding new integration account:', account.oauthData.email);
      currentAccounts.push(account);
    }
    
    // Update user settings with the new/updated integration account
    await authStore.updateUserSettings({
      integrationAccounts: currentAccounts
    });
    
    console.log(`Successfully ${existingAccountIndex >= 0 ? 'updated' : 'added'} Microsoft account to user settings`);
    console.log('Updated integration accounts count:', currentAccounts.length);
    
    // Show success notification
    notificationStore.success(i18n.t('settings.connectionSuccessful') || 'Successfully connected to Microsoft');
    
    // Still emit the save event for any parent components that need to know
    emit('save', account);
  }
  catch (error) {
    console.error('Error processing Microsoft auth:', error);
    notificationStore.error(error.message || 'Failed to process Microsoft authentication');
  }
}

// Computed
const isEditMode = computed(() => !!props.account && !props.addOnly);

const hasChanges = computed(() => {
  if (!formData.value || !originalFormData.value) return false
  
  // Compare JSON representations to detect changes
  return JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
})

import { v4 as uuidv4 } from 'uuid';

// Process account data according to new structure
function separateAccountData(account) {
  if (!account) return { formData: null, oauthData: null };
  
  if (account.oauthData) {
    // Account already has new structure
    return {
      formData: {
        id: account.id,
        type: account.type,
        color: account.color,
        syncCalendar: account.syncCalendar,
        syncMail: account.syncMail,
        syncTasks: account.syncTasks,
        syncContacts: account.syncContacts,
        showInCalendar: account.showInCalendar,
        showInMail: account.showInMail,
        showInTasks: account.showInTasks,
        showInContacts: account.showInContacts,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      },
      oauthData: account.oauthData
    };
  }
  
  // For backward compatibility - extract OAuth-specific fields
  const oauth = {
    name: account.name || '',
    email: account.email || '',
    refreshToken: account.refreshToken,
    accessToken: account.accessToken,
    tokenExpiry: account.tokenExpiry,
    clientId: account.clientId,
    clientSecret: account.clientSecret,
    scope: account.scope,
    connected: account.connected || false,
    lastSync: account.lastSync || null
  };
  
  // Create new format formData
  const form = {
    id: account.id,
    type: account.type,
    color: account.color,
    syncCalendar: account.syncCalendar,
    syncMail: account.syncMail,
    syncTasks: account.syncTasks,
    syncContacts: account.syncContacts,
    showInCalendar: account.showInCalendar,
    showInMail: account.showInMail,
    showInTasks: account.showInTasks,
    showInContacts: account.showInContacts,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
  
  return { formData: form, oauthData: oauth };
}

// Create account data for storage/API calls
function mergeAccountData() {
  if (!formData.value) return null;
  
  // Create new account object with the new structure
  const account = { 
    ...formData.value,
    updatedAt: new Date()
  };
  
  // Add OAuth data if available
  if (oauthData.value) {
    // Filter any undefined values from oauthData
    const filteredOAuthData = {};
    Object.entries(oauthData.value).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        filteredOAuthData[key] = value;
      }
    });
    
    account.oauthData = filteredOAuthData;
  } else {
    account.oauthData = {
      connected: false,
      email: '',
      name: ''
    };
  }
  
  return account;
}

// Watchers
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal;
  
  // Initialize form when dialog opens
  if (newVal) {
    if (props.account) {
      // Separate OAuth data from form data
      const { formData: form, oauthData: oauth } = separateAccountData(props.account);
      
      // Deep clone to avoid modifying props directly
      formData.value = JSON.parse(JSON.stringify(form));
      originalFormData.value = JSON.parse(JSON.stringify(form));
      oauthData.value = JSON.parse(JSON.stringify(oauth));
      
      console.log('Initialized with form data:', formData.value);
      console.log('Initialized with OAuth data:', oauthData.value);
    } else {
      formData.value = null;
      originalFormData.value = null;
      oauthData.value = null;
    }
    
    // Clear messages
    errorMsg.value = '';
    successMsg.value = '';
  }
}, { immediate: true })

watch(() => dialogVisible.value, (newVal) => {
  emit('update:modelValue', newVal);
})

// Methods
function close() {
  dialogVisible.value = false;
  formData.value = null;
  originalFormData.value = null;
  oauthData.value = null;
  errorMsg.value = '';
  successMsg.value = '';
}


async function connectAndClose() {
  console.info('Connect and close with form data:', formData.value);
  console.info('OAuth data:', oauthData.value);
  
  if (!formData.value) return;
  
  isSaving.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    // Make sure we have a valid account object with all required fields
    if (!formData.value.id) {
      console.error('Missing account ID');
      throw new Error('Account ID is required');
    }
    
    if (!formData.value.type) {
      console.error('Missing required account fields');
      throw new Error('Account type is required');
    }
    
    if (!oauthData.value || !oauthData.value.email) {
      console.error('Missing OAuth email');
      throw new Error('OAuth email is required');
    }
    
    // Set lastSync if it doesn't exist
    if (!oauthData.value.lastSync) {
      oauthData.value.lastSync = new Date();
    }
    
    // Check for refresh token
    if (!oauthData.value.refreshToken) {
      console.warn('⚠️ No refresh token in account being saved! Authentication may fail later.');
    } else {
      console.log('✅ Refresh token is present in account being saved.');
    }
    
    // Brief delay to simulate saving
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Merge form and OAuth data for storage
    const mergedAccount = mergeAccountData();
    
    // Log what we're saving to Firebase
    console.log('Saving to Firebase:', {
      id: mergedAccount.id,
      type: mergedAccount.type,
      oauthData: {
        email: mergedAccount.oauthData.email,
        name: mergedAccount.oauthData.name,
        connected: mergedAccount.oauthData.connected,
        hasRefreshToken: !!mergedAccount.oauthData.refreshToken
      }
    });
    
    // Send the merged account data to parent component
    emit('save', mergedAccount);
    
    // Show success message
    successMsg.value = isEditMode.value
      ? 'Integration account updated successfully'
      : 'Integration account added successfully';
    
    // Briefly show success message before closing
    setTimeout(() => {
      dialogVisible.value = false;
    }, 1000);
  } catch (err) {
    console.error('Error saving account:', err);
    errorMsg.value = err.message || 'Error saving account';
  } finally {
    isSaving.value = false;
  }
}

async function saveAccount() {
  if (!formData.value) return;
  
  isSaving.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    // Make sure we have a valid account object with all required fields
    if (!formData.value.id) {
      console.error('Missing account ID');
      throw new Error('Account ID is required');
    }
    
    if (!formData.value.type) {
      console.error('Missing required account fields');
      throw new Error('Account type is required');
    }
    
    if (!oauthData.value || !oauthData.value.email) {
      console.error('Missing OAuth email');
      throw new Error('OAuth email is required');
    }
    
    // Brief delay to simulate saving
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Merge form and OAuth data for storage
    const mergedAccount = mergeAccountData();
    
    // Send the merged account data to parent component
    emit('save', mergedAccount);
    
    // Show success message but keep dialog open until parent confirms save
    successMsg.value = isEditMode.value
      ? 'Integration account updated successfully'
      : 'Integration account added successfully';
  } catch (err) {
    console.error('Error saving account:', err);
    errorMsg.value = err.message || 'Error saving account';
  } finally {
    isSaving.value = false;
  }
}
</script>
