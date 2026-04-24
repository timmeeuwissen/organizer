<template lang="pug">
v-container
  v-row
    v-col(cols="12")
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
      CollapsibleCard.mt-4(:title="$t('ai.manageAIIntegrations')")
        template(#header-actions)
          v-btn(
            color="primary"
            icon
            size="small"
            variant="text"
            @click="openAIIntegrationDialog()"
            :disabled="isSaving"
          )
            v-icon mdi-plus
        template(v-if="aiIntegrationsInput.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('ai.noAIIntegrations') }}
        template(v-else)
          v-list
            v-list-item(
              v-for="(integration, index) in aiIntegrationsInput"
              :key="index"
              :active="false"
            )
              template(v-slot:prepend)
                v-avatar(:color="getIntegrationColor(integration.provider)")
                  v-icon(color="white") {{ getIntegrationIcon(integration.provider) }}

              v-list-item-title {{ integration.name }}

              v-list-item-subtitle
                | {{ getProviderName(integration.provider) }}
                v-chip(
                  :color="integration.enabled ? 'success' : 'error'"
                  size="x-small"
                  class="ml-2"
                ) {{ integration.enabled ? $t('settings.enabled') : $t('settings.disabled') }}

              template(v-slot:append)
                v-btn(
                  icon
                  variant="text"
                  size="small"
                  @click="openAIIntegrationDialog(integration, index)"
                  :title="$t('common.edit')"
                )
                  v-icon mdi-pencil

                v-btn(
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeAIIntegration(index)"
                  :title="$t('common.delete')"
                )
                  v-icon mdi-delete

      // External service integrations
      CollapsibleCard.mt-4(:title="$t('settings.integrations')")
        template(#header-actions)
          v-btn(
            color="primary"
            icon
            size="small"
            variant="text"
            @click="showAddIntegrationDialog"
            :disabled="isSaving"
          )
            v-icon mdi-plus
        v-alert(v-if="integrationErrorMsg" type="error" class="mx-4 mt-2") {{ integrationErrorMsg }}
        v-alert(v-if="integrationSuccessMsg" type="success" class="mx-4 mt-2") {{ integrationSuccessMsg }}
        template(v-if="integrationAccounts.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('settings.noIntegrations') }}
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

              .flex-grow-1.min-width-0.pr-2
                v-list-item-title {{ account.oauthData.name }}
                v-list-item-subtitle
                  span {{ getAccountTypeName(account.type) }} | {{ account.oauthData.email }}
                  v-chip(
                    :color="account.oauthData.connected ? 'success' : 'error'"
                    size="x-small"
                    class="ml-2"
                  ) {{ account.oauthData.connected ? $t('settings.connected') : $t('settings.disconnected') }}
                .d-flex.flex-wrap.gap-1.mt-2
                  v-chip(
                    v-for="mod in getIntegrationModuleUsage(account)"
                    :key="mod.key"
                    size="x-small"
                    :prepend-icon="integrationModuleIcon(mod.key)"
                    :color="integrationModuleChipColor(mod.state)"
                    :variant="mod.state === 'off' ? 'tonal' : 'flat'"
                    :title="integrationModuleTooltip(mod)"
                  ) {{ integrationModuleLabel(mod.key) }}

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
                      :model-value="account.color"
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

        v-card-actions.px-0
          v-spacer
          v-btn(
            color="primary"
            @click="saveProfileChanges"
            :loading="isSaving"
            :disabled="!hasProfileChanges || isSaving"
          ) {{ $t('common.save') }}

      // API Access section
      CollapsibleCard.mt-4(
        :title="$t('settings.apiAccess')"
        :help-text="$t('settings.apiAccessHelpText')"
      )
        template(#header-actions)
          v-btn(
            v-if="!apiToken"
            icon
            size="small"
            variant="text"
            :loading="apiTokenLoading"
            @click="generateApiToken"
          )
            v-icon mdi-plus
        .d-flex.align-center.mb-3(v-if="apiToken")
          v-text-field(
            :value="apiTokenVisible ? apiToken : apiToken.replace(/./g, '•')"
            readonly
            variant="outlined"
            density="compact"
            hide-details
            class="mr-2"
            append-inner-icon="mdi-content-copy"
            @click:append-inner="copyApiToken"
          )
          v-btn(icon variant="text" size="small" @click="apiTokenVisible = !apiTokenVisible")
            v-icon {{ apiTokenVisible ? 'mdi-eye-off' : 'mdi-eye' }}
        v-alert(v-else type="info" variant="tonal" class="mb-3") {{ $t('settings.noApiToken') }}
        v-card-actions.px-0(v-if="apiToken")
          v-btn(
            color="warning"
            variant="tonal"
            :loading="apiTokenLoading"
            @click="regenerateApiToken"
          ) {{ $t('settings.regenerateToken') }}
          v-spacer
          v-btn(
            color="error"
            variant="text"
            :loading="apiTokenLoading"
            @click="revokeApiToken"
          ) {{ $t('settings.revokeToken') }}

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
  // AI Integration dialog
  AIIntegrationDialog(
    v-model="showAIIntegrationDialog"
    :integrationData="selectedAIIntegration"
    @save="saveAIIntegration"
  )
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useNuxtApp } from '#app'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getAuth, updateProfile } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import CollapsibleCard from '~/components/common/CollapsibleCard.vue'
import IntegrationAccountDialog from '~/components/integrations/IntegrationAccountDialog.vue'
import AIIntegrationDialog from '~/components/integrations/AIIntegrationDialog.vue'
import { useAuthStore } from '~/stores/auth'
import {
  getIntegrationModuleUsage,
  type IntegrationModuleKey,
  type IntegrationModuleUsage,
  type ModuleUsageState
} from '~/utils/integrationModuleUsage'

// Component state
const isLoading = ref(true)
/** When false, ignore auto-save from v-select/v-switch sync (avoids recursive update loops). */
const profileFormReady = ref(false)
const isSaving = ref(false)
const isEditing = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// API token state
const apiToken = ref<string | null>(null)
const apiTokenVisible = ref(false)
const apiTokenLoading = ref(false)

async function loadApiToken () {
  try {
    const auth = getAuth()
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) { return }
    // Token is stored in Firestore user doc — read it via the token endpoint (returns current token)
    const db = getFirestore()
    const { doc: fsDoc, getDoc } = await import('firebase/firestore')
    const userSnap = await getDoc(fsDoc(db, 'users', auth.currentUser!.uid))
    if (userSnap.exists()) {
      apiToken.value = userSnap.data().apiToken || null
    }
  } catch { /* ignore */ }
}

async function generateApiToken () {
  apiTokenLoading.value = true
  try {
    const auth = getAuth()
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) { return }
    const res = await $fetch<{ success: boolean; token: string }>('/api/v1/auth/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (res.success) { apiToken.value = res.token }
  } catch { /* handled by UI */ } finally {
    apiTokenLoading.value = false
  }
}

async function regenerateApiToken () {
  await generateApiToken()
}

async function revokeApiToken () {
  apiTokenLoading.value = true
  try {
    const auth = getAuth()
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) { return }
    await $fetch('/api/v1/auth/token', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    apiToken.value = null
  } catch { /* handled by UI */ } finally {
    apiTokenLoading.value = false
  }
}

function copyApiToken () {
  if (apiToken.value) {
    navigator.clipboard.writeText(apiToken.value)
  }
}

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

// AI integration
const showAIIntegrationDialog = ref(false)
const selectedAIIntegration = ref(null)

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
  required: v => !!v || 'This field is required',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail must be valid'
}

// Composables
const authStore = useAuthStore()
const i18n = useI18n()
const router = useRouter()
const networkStatus = useNetworkStatus()
const { $theme: themeService } = useNuxtApp()

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
  if (!user.value) { return false }

  // Check for basic settings changes
  const basicSettingsChanged = (
    displayNameInput.value !== (user.value.displayName || '') ||
    darkModeInput.value !== (user.value.settings?.darkMode || false) ||
    languageInput.value !== (user.value.settings?.defaultLanguage || 'en') ||
    weekStartsDayInput.value !== (user.value.settings?.weekStartsOn ?? 1) ||
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
  profileFormReady.value = false

  try {
    // Check authentication
    if (!authStore.isAuthenticated) {
      if (authStore.loading) {
        // Wait for auth state to resolve
        const unwatch = watch(
          () => authStore.loading,
          async (val) => {
            if (!val) {
              unwatch()
              if (!authStore.isAuthenticated) {
                router.push('/auth/login')
              } else {
                loadUserData()
                loadApiToken()
                setTimeout(() => { profileFormReady.value = true }, 0)
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
      loadApiToken()
      setTimeout(() => { profileFormReady.value = true }, 0)
    }
  } catch (err) {
    console.error('Error in profile mount:', err)
    errorMsg.value = err.message || 'Failed to load profile'
  } finally {
    isLoading.value = false
  }
})

// Methods
function loadUserData () {
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

function getAccountIcon (type) {
  switch (type) {
    case 'google':
      return 'mdi-google'
    case 'exchange':
      return 'mdi-microsoft-exchange'
    case 'office365':
      return 'mdi-microsoft-office'
    case 'imap':
      return 'mdi-email-sync'
    case 'pop3':
      return 'mdi-email-receive'
    default:
      return 'mdi-account'
  }
}

function getAccountTypeName (type) {
  switch (type) {
    case 'google':
      return i18n.t('settings.google')
    case 'exchange':
      return i18n.t('settings.exchange')
    case 'office365':
      return i18n.t('settings.office365')
    case 'imap':
      return i18n.t('settings.imap')
    case 'pop3':
      return i18n.t('settings.pop3')
    default:
      return type
  }
}

const INTEGRATION_MODULE_META: Record<
  IntegrationModuleKey,
  { titleKey: string; icon: string }
> = {
  mail: { titleKey: 'mail.title', icon: 'mdi-email' },
  calendar: { titleKey: 'calendar.title', icon: 'mdi-calendar' },
  tasks: { titleKey: 'tasks.title', icon: 'mdi-checkbox-marked-outline' },
  people: { titleKey: 'people.title', icon: 'mdi-account-group' },
  meetings: { titleKey: 'meetings.title', icon: 'mdi-calendar-account' }
}

function integrationModuleLabel (key: IntegrationModuleKey): string {
  return String(i18n.t(INTEGRATION_MODULE_META[key].titleKey))
}

function integrationModuleIcon (key: IntegrationModuleKey): string {
  return INTEGRATION_MODULE_META[key].icon
}

function integrationModuleChipColor (state: ModuleUsageState): string {
  if (state === 'active') {
    return 'success'
  }
  if (state === 'pending') {
    return 'warning'
  }
  return 'default'
}

function integrationModuleTooltip (mod: IntegrationModuleUsage): string {
  const moduleName = integrationModuleLabel(mod.key)
  if (mod.state === 'active') {
    return String(i18n.t('settings.integrationModuleActive', { module: moduleName }))
  }
  if (mod.state === 'pending') {
    return String(i18n.t('settings.integrationModulePending', { module: moduleName }))
  }
  return String(i18n.t('settings.integrationModuleOff', { module: moduleName }))
}

function showAddIntegrationDialog () {
  // Create a new account template with reasonable defaults
  const now = new Date()
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

function normalizePickerColor (value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object' && 'hex' in value) {
    const hex = (value as { hex?: string }).hex
    if (typeof hex === 'string') {
      return hex
    }
  }
  return ''
}

// Update integration color
async function updateIntegrationColor (accountId, newColor) {
  const normalized = normalizePickerColor(newColor)
  if (!normalized) {
    return
  }
  const index = integrationAccounts.value.findIndex(account => account.id === accountId)
  if (index >= 0) {
    if (integrationAccounts.value[index].color === normalized) {
      return
    }
    // Update the color (single writer — avoid v-model + handler double updates)
    integrationAccounts.value[index].color = normalized
    integrationAccounts.value[index].updatedAt = new Date()

    // Update settings
    await updateUserSettings()

    // Show success message
    integrationSuccessMsg.value = 'Integration color updated'
    setTimeout(() => {
      integrationSuccessMsg.value = ''
    }, 2000)
  }
}

function confirmDeleteIntegration (account) {
  accountToDelete.value = account
  showDeleteDialog.value = true
}

async function deleteIntegrationAccount () {
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

async function saveIntegrationAccount (account) {
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

function handleIntegrationTest (account) {
  console.log('Test account', account)
}

function handleDarkModeChange () {
  // Use our theme plugin instead of Vuetify's theme directly
  if (themeService) {
    themeService.toggle(darkModeInput.value)
  }
  if (!profileFormReady.value) {
    return
  }
  handleSettingsChange()
}

function handleLanguageChange () {
  try {
    // Handle language change safely by checking for existence of properties
    if (i18n && i18n.locale) {
      i18n.locale.value = languageInput.value
    }
  } catch (err) {
    console.error('Error changing language:', err)
    // Continue with settings update even if language change fails
  }

  if (!profileFormReady.value) {
    return
  }
  handleSettingsChange()
}

function handleSettingsChange () {
  if (!profileFormReady.value) {
    return
  }
  // Don't auto-save if not online
  if (!networkStatus.isOnline.value) {
    return
  }

  console.log('Handling settings change, will update user settings')
  updateUserSettings()
}

// AI Integration helpers
function getIntegrationColor (provider) {
  switch (provider) {
    case 'openai':
      return '#10a37f' // OpenAI green
    case 'gemini':
      return '#4285F4' // Google blue
    case 'xai':
      return '#7b3dbd' // Purple for XAI
    case 'claude':
      return '#D97706' // Anthropic amber
    default:
      return '#607D8B' // Default gray
  }
}

function getIntegrationIcon (provider) {
  switch (provider) {
    case 'openai':
      return 'mdi-brain'
    case 'gemini':
      return 'mdi-google'
    case 'xai':
      return 'mdi-robot'
    case 'claude':
      return 'mdi-chat-processing'
    default:
      return 'mdi-api'
  }
}

function getProviderName (provider) {
  switch (provider) {
    case 'openai':
      return 'OpenAI'
    case 'gemini':
      return 'Google Gemini'
    case 'xai':
      return 'XAI (Grok)'
    case 'claude':
      return 'Claude (Anthropic)'
    default:
      return provider
  }
}

// Show AI Integration dialog
function openAIIntegrationDialog (integration = null, index = -1) {
  if (integration) {
    // Edit existing integration - clone to avoid direct mutations
    selectedAIIntegration.value = JSON.parse(JSON.stringify(integration))
  } else {
    // Create a new integration with default values
    const now = new Date()
    selectedAIIntegration.value = {
      provider: 'openai',
      name: i18n.t('ai.newIntegration'),
      apiKey: '',
      enabled: true,
      connected: false,
      createdAt: now
    }
  }

  // Show the dialog
  showAIIntegrationDialog.value = true
}

// Remove AI Integration
function removeAIIntegration (index) {
  if (index >= 0 && index < aiIntegrationsInput.value.length) {
    aiIntegrationsInput.value.splice(index, 1)
  }
}

// Save AI Integration from dialog
async function saveAIIntegration (integration) {
  console.log('Saving AI integration:', integration)

  // Check if this is an update or new integration
  const existingIndex = aiIntegrationsInput.value.findIndex(
    i => i.provider === integration.provider && i.apiKey === integration.apiKey
  )

  if (existingIndex >= 0) {
    // Update existing integration
    aiIntegrationsInput.value[existingIndex] = integration
  } else {
    // Add new integration
    aiIntegrationsInput.value.push(integration)
  }

  // Save changes to database immediately
  isSaving.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    // Update settings in Firestore
    await updateUserSettings()

    successMsg.value = existingIndex >= 0
      ? i18n.t('ai.aiIntegrationUpdated')
      : i18n.t('ai.aiIntegrationAdded')

    setTimeout(() => {
      successMsg.value = ''
    }, 3000)
  } catch (err) {
    errorMsg.value = err.message || i18n.t('ai.saveError')
    console.error('AI integration save error:', err)
  } finally {
    isSaving.value = false
  }
}

// Specific handler for AI integrations changes
function handleAIIntegrationsChange (integrations) {
  console.log('AI integrations changed, will update in Firestore:', integrations)

  // Store the integrations in the local state but don't immediately save to Firestore
  // This prevents unnecessary updates and recursive calls
  aiIntegrationsInput.value = integrations

  // Setting this flag will make the Save button active
  // User can then choose when to save the changes to Firestore
}

async function updateUserSettings () {
  if (!user.value) { return }

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

async function saveProfileChanges () {
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
function formatDate (date) {
  if (!date) { return '' }

  const d = new Date(date)
  return d.toLocaleString()
}
</script>
