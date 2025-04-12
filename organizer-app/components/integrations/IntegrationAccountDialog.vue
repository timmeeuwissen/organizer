<template lang="pug">
v-dialog(
  v-model="dialogVisible"
  max-width="700px"
  persistent
)
  v-card
    v-card-title
      span {{ dialogTitle }}
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
      integration-account-form(
        ref="accountForm"
        :account="formDataForDisplay"
        :isEditMode="isEditMode"
        @save="handleSave"
        @test="handleTest"
        @sync="handleSync"
        @disconnect="handleDisconnect"
        @update:account="handleFormUpdate"
      )
    
    v-card-actions
      v-spacer
      v-btn(color="error" variant="text" @click="close") {{ $t('common.cancel') }}
      v-btn(
        color="primary"
        @click="connectAndClose"
        :disabled="!hasChanges || isSaving"
        :loading="isSaving"
      ) {{ $t('common.done') }}
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IntegrationAccountForm from './IntegrationAccountForm.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  account: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'save', 'test'])

// State
const dialogVisible = ref(false)
const formData = ref(null)          // Form data only (UI-related fields)
const oauthData = ref(null)         // OAuth-related data (tokens, etc.)
const originalFormData = ref(null)  // Original form data for comparison
const accountForm = ref(null)
const errorMsg = ref('')
const successMsg = ref('')
const isSaving = ref(false)

// Composables
const i18n = useI18n()

// Computed
const isEditMode = computed(() => !!props.account)

const dialogTitle = computed(() => {
  if (isEditMode.value) {
    return i18n.t('settings.editIntegration')
  }
  return i18n.t('settings.addIntegration')
})

const hasChanges = computed(() => {
  if (!formData.value || !originalFormData.value) return false
  
  // Compare JSON representations to detect changes
  return JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
})

// For display in the form, we need to merge the form data with connected status
// from OAuth data, so the form knows if the account is connected or not
const formDataForDisplay = computed(() => {
  if (!formData.value) return null;
  
  // Create a merged display object for the form
  return {
    ...formData.value,
    // Include connected status if available
    connected: oauthData.value?.connected || false,
    // Pass lastSync if available for display purposes
    lastSync: oauthData.value?.lastSync || null
  }
})

// Separate OAuth data from account data
function separateAccountData(account) {
  if (!account) return { formData: null, oauthData: null };
  
  // Extract OAuth-specific fields
  const oauth = {
    refreshToken: account.refreshToken,
    accessToken: account.accessToken,
    tokenExpiry: account.tokenExpiry,
    clientId: account.clientId,
    clientSecret: account.clientSecret,
    scope: account.scope,
    connected: account.connected || false,
    lastSync: account.lastSync || null
  };
  
  // Extract form data (everything else)
  const form = { ...account };
  
  // Remove OAuth fields from form data
  delete form.refreshToken;
  delete form.accessToken;
  delete form.tokenExpiry;
  delete form.clientId;
  delete form.clientSecret;
  delete form.scope;
  
  return { formData: form, oauthData: oauth };
}

// Merge form data with OAuth data for storage/API calls
function mergeAccountData() {
  if (!formData.value) return null;
  
  // Start with form data
  const merged = { ...formData.value };
  
  // Add OAuth data if available
  if (oauthData.value) {
    // Only add non-null and non-undefined values
    Object.entries(oauthData.value).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        merged[key] = value;
      }
    });
  }
  
  // Filter out any undefined values that might cause Firestore errors
  Object.keys(merged).forEach(key => {
    if (merged[key] === undefined) {
      delete merged[key];
    }
  });
  
  return merged;
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

function handleFormUpdate(updatedFormData) {
  console.info('Form data updated:', updatedFormData);
  // Update form data only - OAuth data remains unchanged
  formData.value = updatedFormData;
}

function handleTest(testAccountData) {
  errorMsg.value = '';
  successMsg.value = '';
  
  // For testing connectivity, we'll use the form data but keep our OAuth tokens
  console.log('Testing connection with form data:', testAccountData);
  
  // Mock a connection test
  setTimeout(() => {
    const success = Math.random() > 0.2; // 80% success rate for testing
    
    if (success) {
      successMsg.value = i18n.t('settings.connectionSuccessful');
      
      // When the test succeeds, we might get new tokens back
      // In a real implementation, we would extract the OAuth data from the test result
      const testResult = testAccountData; // This would normally come from the API
      
      // Extract any new OAuth data from test result
      const { oauthData: newOAuthData } = separateAccountData(testResult);
      
      // Merge with existing OAuth data, keeping existing values if new ones aren't provided
      if (newOAuthData) {
        if (!oauthData.value) {
          oauthData.value = {};
        }
        
        Object.entries(newOAuthData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            oauthData.value[key] = value;
          }
        });
        
        // Mark as connected
        oauthData.value.connected = true;
      }
      
      emit('test', mergeAccountData());
      
      setTimeout(() => {
        successMsg.value = '';
      }, 3000);
    } else {
      errorMsg.value = i18n.t('settings.connectionFailed');
      setTimeout(() => {
        errorMsg.value = '';
      }, 3000);
    }
  }, 1000);
}

function handleSave(updatedFormData) {
  console.info('Save requested with form data:', updatedFormData);
  
  // Update form data
  formData.value = updatedFormData;
  
  saveAccount();
}

function handleSync(updatedFormData) {
  console.info('Sync requested with form data:', updatedFormData);
  
  // Update form data
  formData.value = updatedFormData;
  
  // Update lastSync in OAuth data
  if (!oauthData.value) {
    oauthData.value = {};
  }
  oauthData.value.lastSync = new Date();
  
  successMsg.value = i18n.t('settings.connectionSuccessful');
  setTimeout(() => {
    successMsg.value = '';
  }, 3000);
}

function handleDisconnect(updatedFormData) {
  console.info('Disconnect requested with form data:', updatedFormData);
  
  // Update form data
  formData.value = updatedFormData;
  
  // Mark as disconnected in OAuth data, but preserve tokens
  if (oauthData.value) {
    oauthData.value.connected = false;
  }
  
  successMsg.value = i18n.t('settings.disconnected');
  setTimeout(() => {
    successMsg.value = '';
  }, 3000);
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
    
    if (!formData.value.name || !formData.value.email || !formData.value.type) {
      console.error('Missing required account fields');
      throw new Error('Name, email and account type are required');
    }
    
    // Ensure OAuth data exists
    if (!oauthData.value) {
      oauthData.value = {};
    }
    
    // Always ensure connected status is set to true when saving
    oauthData.value.connected = true;
    
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
      name: mergedAccount.name, 
      type: mergedAccount.type,
      email: mergedAccount.email,
      hasRefreshToken: !!mergedAccount.refreshToken,
      refreshTokenLength: mergedAccount.refreshToken ? mergedAccount.refreshToken.length : 0
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
    
    if (!formData.value.name || !formData.value.email || !formData.value.type) {
      console.error('Missing required account fields');
      throw new Error('Name, email and account type are required');
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
