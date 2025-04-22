<template lang="pug">
v-container
  v-row
    v-col(cols="12" md="8" offset-md="2")
      v-card
        v-card-title {{ $t('auth.userProfile') }}
        v-card-subtitle(v-if="user") {{ user.email }}
        
        v-alert(v-if="errorMsg" type="error" class="mx-4 mt-2") {{ errorMsg }}
        v-alert(v-if="successMsg" type="success" class="mx-4 mt-2") {{ successMsg }}
        
        v-card-text(v-if="isLoading")
          v-progress-circular(indeterminate color="primary")
        
        v-card-text(v-else)
          v-row
            v-col(cols="12" md="4" class="text-center")
              v-avatar(size="150" color="primary" v-if="!user || !user.photoURL")
                span.text-h3 {{ initials }}
              v-avatar(size="150" v-else)
                v-img(:src="user.photoURL" :alt="user.displayName || user.email")
              
              v-btn(variant="text" color="primary" class="mt-4") {{ $t('common.edit') }}
            
            v-col(cols="12" md="8")
              v-text-field(
                v-model="displayNameInput"
                :label="$t('people.name')"
                prepend-icon="mdi-account"
                :readonly="!isEditing"
              )
              
              v-text-field(
                :value="user ? user.email : ''"
                label="Email"
                prepend-icon="mdi-email"
                disabled
              )
              
              v-divider(class="my-4")
              
              div.text-subtitle-1.pa-2 {{ $t('auth.settings') }}
              
              v-switch(
                v-model="darkModeInput"
                :label="$t('settings.darkMode')"
                color="primary"
                @change="handleDarkModeChange"
              )
              
              v-select(
                v-model="languageInput"
                :items="languageList"
                :label="$t('settings.language')"
                item-title="text"
                item-value="value"
                @update:model-value="handleLanguageChange"
              )
              
              v-select(
                v-model="weekStartsDayInput"
                :items="weekDayOptions"
                :label="$t('settings.weekStartsOn')"
                item-title="text"
                item-value="value"
                @update:model-value="handleSettingsChange"
              )
              
              v-switch(
                v-model="emailNotificationsInput"
                :label="$t('settings.emailNotifications')"
                color="primary"
                @change="handleSettingsChange"
              )
              
              v-switch(
                v-model="calendarSyncInput"
                :label="$t('settings.calendarSync')"
                color="primary"
                @change="handleSettingsChange"
              )
      
      // AI integrations
      v-card(class="mt-4")
        v-card-text
          AIIntegrationForm(
            v-model="aiIntegrationsInput" 
            @update:modelValue="handleAIIntegrationsChange"
          )
      
      // External service integrations
      v-card(class="mt-4")
        v-card-title 
          | {{ $t('settings.integrations') }}
          v-spacer
          v-btn(
            color="primary" 
            icon
            @click="showAddIntegrationDialog"
            :disabled="isSaving"
          )
            v-icon mdi-plus
        
        v-alert(v-if="integrationErrorMsg" type="error" class="mx-4 mt-2") {{ integrationErrorMsg }}
        v-alert(v-if="integrationSuccessMsg" type="success" class="mx-4 mt-2") {{ integrationSuccessMsg }}
        
        v-card-text
          template(v-if="integrationAccounts.length === 0")
            v-alert(type="info" variant="tonal")
              | {{ $t('settings.noIntegrations') }}
              div.text-center.mt-3
                v-btn(
                  color="primary"
                  @click="showAddIntegrationDialog"
                  :disabled="isSaving"
                ) {{ $t('settings.addYourFirstIntegration') }}
          
          template(v-else)
            v-list
              v-list-item(
                v-for="account in integrationAccounts"
                :key="account.id"
                :active="false"
              )
                template(v-slot:prepend)
                  v-avatar(:color="account.color")
                    v-icon(color="white") {{ getAccountIcon(account.type) }}
                
                v-list-item-title {{ account.oauthData.name }}
                
                v-list-item-subtitle
                  | {{ getAccountTypeName(account.type) }} | {{ account.oauthData.email }}
                  v-chip(
                    :color="account.oauthData.connected ? 'success' : 'error'"
                    size="x-small"
                    class="ml-2"
                  ) {{ account.oauthData.connected ? $t('settings.connected') : $t('settings.disconnected') }}
                
                template(v-slot:append)
                  // Color picker
                  v-menu(location="bottom")
                    template(v-slot:activator="{ props }")
                      v-btn(
                        icon
                        variant="text"
                        size="small"
                        v-bind="props"
                        :title="$t('settings.changeColor')"
                      )
                        v-icon mdi-palette
                    
                    v-card(min-width="300" class="pa-3")
                      v-card-title(class="text-subtitle-1 pb-0") {{ $t('settings.changeColor') }}
                      v-color-picker(
                        v-model="account.color"
                        :swatches="colorSwatches"
                        show-swatches
                        hide-inputs
                        hide-canvas
                        @update:model-value="updateIntegrationColor(account.id, $event)"
                      )
                  
                  // Delete button
                  v-btn(
                    icon
                    variant="text"
                    size="small"
                    color="error"
                    @click.stop="confirmDeleteIntegration(account)"
                    :title="$t('common.delete')"
                  )
                    v-icon mdi-delete
        
        v-card-actions
          v-spacer
          v-btn(
            color="primary"
            @click="saveProfileChanges"
            :loading="isSaving"
            :disabled="!hasProfileChanges || isSaving"
          ) {{ $t('common.save') }}
  
  // Integration account dialog (only for adding new integrations)
  integration-account-dialog(
    v-model="showIntegrationDialog"
    :account="selectedIntegrationAccount"
    @save="saveIntegrationAccount"
    @test="handleIntegrationTest"
    add-only
  )
  
  // Confirm delete dialog  
  v-dialog(v-model="showDeleteDialog" max-width="500")
    v-card
      v-card-title {{ $t('common.delete') }} {{ accountToDelete?.oauthData?.name }}?
      v-card-text 
        | {{ $t('common.delete') }} {{ getAccountTypeName(accountToDelete?.type) }} 
        | {{ $t('settings.integrationAccount') }} {{ accountToDelete?.oauthData?.email }}?
        | {{ $t('common.delete') }}?
      v-card-actions
        v-spacer
        v-btn(variant="text" @click="showDeleteDialog = false") {{ $t('common.cancel') }}
        v-btn(
          color="error"
          @click="deleteIntegrationAccount"
          :loading="isDeletingAccount"
        ) {{ $t('common.delete') }}
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { getAuth, updateProfile } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import IntegrationAccountDialog from '~/components/integrations/IntegrationAccountDialog.vue'
import AIIntegrationForm from '~/components/integrations/AIIntegrationForm.vue'
import { v4 as uuidv4 } from 'uuid'

// Component state
const isLoading = ref(true)
const isSaving = ref(false)
const isEditing = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Form inputs
const displayNameInput = ref('')
const darkModeInput = ref(false)
const languageInput = ref('en')
const weekStartsDayInput = ref(1) // Default to Monday
const emailNotificationsInput = ref(true)
const calendarSyncInput = ref(false)
const aiIntegrationsInput = ref([])

// Week start day options
const weekDayOptions = [
  { text: 'Sunday', value: 0 },
  { text: 'Monday', value: 1 },
  { text: 'Tuesday', value: 2 },
  { text: 'Wednesday', value: 3 },
  { text: 'Thursday', value: 4 },
  { text: 'Friday', value: 5 },
  { text: 'Saturday', value: 6 }
]

// Integration accounts
const integrationAccounts = ref([])
const showIntegrationDialog = ref(false)
const selectedIntegrationAccount = ref(null)
const integrationErrorMsg = ref('')
const integrationSuccessMsg = ref('')

// Delete dialog
const showDeleteDialog = ref(false)
const accountToDelete = ref(null)
const isDeletingAccount = ref(false)

// Color swatches for accounts
const colorSwatches = [
  ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
  ['#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39'],
  ['#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B']
]

// Validation rules
const rules = {
  required: (v) => !!v || 'This field is required',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail must be valid'
}

// Composables
const authStore = useAuthStore()
const i18n = useI18n()
const router = useRouter()
const networkStatus = useNetworkStatus()
const themeService = inject('theme')

// Computed properties
const user = computed(() => authStore.currentUser)

const initials = computed(() => {
  if (!user.value || !user.value.displayName) {
    return user.value && user.value.email ? user.value.email.charAt(0).toUpperCase() : '?'
  }
  
  return user.value.displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
})

const hasProfileChanges = computed(() => {
  if (!user.value) return false
  
  // Check for basic settings changes
  const basicSettingsChanged = (
    displayNameInput.value !== (user.value.displayName || '') ||
    darkModeInput.value !== (user.value.settings?.darkMode || false) ||
    languageInput.value !== (user.value.settings?.defaultLanguage || 'en') ||
    emailNotificationsInput.value !== (user.value.settings?.emailNotifications || true) ||
    calendarSyncInput.value !== (user.value.settings?.calendarSync || false)
  )
  
  // Check for integration account changes
  const userIntegrations = user.value.settings?.integrationAccounts || []
  const integrationsChanged = integrationAccounts.value.length !== userIntegrations.length ||
    JSON.stringify(integrationAccounts.value) !== JSON.stringify(userIntegrations)
    
  // Check for AI integration changes
  const userAIIntegrations = user.value.settings?.aiIntegrations || []
  const aiIntegrationsChanged = aiIntegrationsInput.value.length !== userAIIntegrations.length ||
    JSON.stringify(aiIntegrationsInput.value) !== JSON.stringify(userAIIntegrations)
  
  return basicSettingsChanged || integrationsChanged || aiIntegrationsChanged
})

// Available languages
const languageList = [
  { text: 'English', value: 'en' },
  { text: 'Nederlands', value: 'nl' }
]

// Lifecycle hooks
onMounted(async () => {
  isLoading.value = true
  
  try {
    // Check authentication
    if (!authStore.isAuthenticated) {
      if (authStore.loading) {
        // Wait for auth state to resolve
        const unwatch = watch(
          () => authStore.loading,
          (val) => {
            if (!val) {
              unwatch()
              if (!authStore.isAuthenticated) {
                router.push('/auth/login')
              } else {
                loadUserData()
              }
            }
          }
        )
      } else {
        // Not authenticated, redirect
        router.push('/auth/login')
      }
    } else {
      // Already authenticated, load data
      loadUserData()
    }
  } catch (err) {
    console.error('Error in profile mount:', err)
    errorMsg.value = err.message || 'Failed to load profile'
  } finally {
    isLoading.value = false
  }
})

// Methods
function loadUserData() {
  if (user.value) {
    displayNameInput.value = user.value.displayName || ''
    darkModeInput.value = user.value.settings?.darkMode || false
    languageInput.value = user.value.settings?.defaultLanguage || 'en'
    weekStartsDayInput.value = user.value.settings?.weekStartsOn ?? 1 // Default to Monday if not set
    emailNotificationsInput.value = user.value.settings?.emailNotifications || true
    calendarSyncInput.value = user.value.settings?.calendarSync || false
    
    // Integration accounts
    integrationAccounts.value = Array.isArray(user.value.settings?.integrationAccounts) 
      ? JSON.parse(JSON.stringify(user.value.settings.integrationAccounts))
      : []
      
    // AI integrations
    console.log('Loading AI integrations from user settings:', user.value.settings?.aiIntegrations)
    aiIntegrationsInput.value = Array.isArray(user.value.settings?.aiIntegrations)
      ? JSON.parse(JSON.stringify(user.value.settings.aiIntegrations))
      : []
  }
}

function getAccountIcon(type) {
  switch (type) {
    case 'google':
      return 'mdi-google'
    case 'exchange':
      return 'mdi-microsoft-exchange'
    case 'office365':
      return 'mdi-microsoft-office'
    default:
      return 'mdi-account'
  }
}

function getAccountTypeName(type) {
  switch (type) {
    case 'google':
      return i18n.t('settings.google')
    case 'exchange':
      return i18n.t('settings.exchange')
    case 'office365':
      return i18n.t('settings.office365')
    default:
      return type
  }
}

function showAddIntegrationDialog() {
  // Create a new account template with reasonable defaults
  const now = new Date();
  selectedIntegrationAccount.value = {
    id: uuidv4(), // Generate a unique ID using imported function
    type: 'google', // Default to Google
    color: '#2196F3', // Default blue
    syncCalendar: true,
    syncMail: true,
    syncTasks: true,
    syncContacts: true,
    showInCalendar: true,
    showInMail: true,
    showInTasks: true,
    showInContacts: true,
    oauthData: {
      connected: false,
      email: user.value?.email || '',
      name: 'New Integration'
    },
    createdAt: now,
    updatedAt: now
  }
  showIntegrationDialog.value = true
}

// Update integration color
async function updateIntegrationColor(accountId, newColor) {
  const index = integrationAccounts.value.findIndex(account => account.id === accountId);
  if (index >= 0) {
    // Update the color
    integrationAccounts.value[index].color = newColor;
    integrationAccounts.value[index].updatedAt = new Date();
    
    // Update settings
    await updateUserSettings();
    
    // Show success message
    integrationSuccessMsg.value = 'Integration color updated';
    setTimeout(() => {
      integrationSuccessMsg.value = '';
    }, 2000);
  }
}

function confirmDeleteIntegration(account) {
  accountToDelete.value = account
  showDeleteDialog.value = true
}

async function deleteIntegrationAccount() {
  if (!accountToDelete.value || !networkStatus.isOnline.value) {
    return
  }
  
  isDeletingAccount.value = true
  
  try {
    const accountId = accountToDelete.value.id
    integrationAccounts.value = integrationAccounts.value.filter(acc => acc.id !== accountId)
    
    // Update settings
    await updateUserSettings()
    
    integrationSuccessMsg.value = 'Integration account removed successfully'
    setTimeout(() => {
      integrationSuccessMsg.value = ''
    }, 3000)
    
    // Close dialog
    showDeleteDialog.value = false
    accountToDelete.value = null
  } catch (err) {
    console.error('Error deleting account:', err)
    integrationErrorMsg.value = err.message || 'Error removing integration account'
    setTimeout(() => {
      integrationErrorMsg.value = ''
    }, 3000)
  } finally {
    isDeletingAccount.value = false
  }
}

async function saveIntegrationAccount(account) {
  if (!networkStatus.isOnline.value) {
    return
  }
  
  try {
    // Check if this is an update or a new account
    const existingIndex = integrationAccounts.value.findIndex(acc => acc.id === account.id)
    
    if (existingIndex >= 0) {
      // Update existing account
      integrationAccounts.value[existingIndex] = account
    } else {
      // Add new account
      integrationAccounts.value.push(account)
    }
    
    // Update settings - wait for this to complete before closing dialog
    await updateUserSettings()
    
    // Display success message
    integrationSuccessMsg.value = existingIndex >= 0
      ? 'Integration account updated successfully'
      : 'Integration account added successfully'
    
    // Keep success message visible for a moment then close dialog
    setTimeout(() => {
      showIntegrationDialog.value = false
      
      // Clear the message after dialog closes
      setTimeout(() => {
        integrationSuccessMsg.value = ''
      }, 1000)
    }, 1500)
  } catch (err) {
    console.error('Error saving account:', err)
    integrationErrorMsg.value = err.message || 'Error saving integration account'
    setTimeout(() => {
      integrationErrorMsg.value = ''
    }, 3000)
  }
}

function handleIntegrationTest(account) {
  console.log('Test account', account)
}

function handleDarkModeChange() {
  // Use our theme plugin instead of Vuetify's theme directly
  if (themeService) {
    themeService.toggle(darkModeInput.value)
  }
  handleSettingsChange()
}

function handleLanguageChange() {
  try {
    // Handle language change safely by checking for existence of properties
    if (i18n && i18n.locale) {
      i18n.locale.value = languageInput.value
    }
  } catch (err) {
    console.error('Error changing language:', err)
    // Continue with settings update even if language change fails
  }
  
  handleSettingsChange()
}

function handleSettingsChange() {
  // Don't auto-save if not online
  if (!networkStatus.isOnline.value) {
    return
  }
  
  console.log('Handling settings change, will update user settings')
  updateUserSettings()
}

// Specific handler for AI integrations changes
function handleAIIntegrationsChange(integrations) {
  console.log('AI integrations changed, will update in Firestore:', integrations)
  // Update immediately in Firestore when AI integrations change
  updateUserSettings()
}

async function updateUserSettings() {
  if (!user.value) return
  
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    const settings = {
      darkMode: darkModeInput.value,
      defaultLanguage: languageInput.value,
      weekStartsOn: weekStartsDayInput.value,
      emailNotifications: emailNotificationsInput.value, 
      calendarSync: calendarSyncInput.value,
      integrationAccounts: integrationAccounts.value,
      aiIntegrations: aiIntegrationsInput.value
    }
    
    // The auth store now handles cleaning undefined values internally
    await authStore.updateUserSettings(settings)
    
    successMsg.value = 'Settings updated successfully'
    setTimeout(() => {
      successMsg.value = ''
    }, 3000)
  } catch (err) {
    errorMsg.value = err.message || 'Error updating settings'
    console.error('Settings update error:', err)
  }
}

async function saveProfileChanges() {
  if (!user.value || !hasProfileChanges.value || !networkStatus.isOnline.value) {
    return
  }
  
  isSaving.value = true
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    // Update settings in Firestore
    await updateUserSettings()
    
    // Update displayName if changed
    if (displayNameInput.value !== (user.value.displayName || '')) {
      // Get current Firebase auth user
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (currentUser) {
        // Update Firebase Auth profile
        await updateProfile(currentUser, {
          displayName: displayNameInput.value
        })
        
        // Update Firestore user document
        const db = getFirestore()
        const userRef = doc(db, 'users', user.value.id)
        await setDoc(userRef, { 
          displayName: displayNameInput.value,
          updatedAt: new Date()
        }, { merge: true })
        
        // Update local user state
        authStore.updateUserProfile({
          displayName: displayNameInput.value
        })
      }
    }
    
    successMsg.value = 'Profile saved successfully'
  } catch (err) {
    errorMsg.value = err.message || 'Error saving profile'
    console.error('Profile save error:', err)
  } finally {
    isSaving.value = false
  }
}

// Helper function to format dates
function formatDate(date) {
  if (!date) return ''
  
  const d = new Date(date)
  return d.toLocaleString()
}
</script>
