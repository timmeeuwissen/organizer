<template lang="pug">
v-form(ref="form" v-model="formValid")
  v-row
    v-col(cols="12")
      v-text-field(
        v-model="accountName"
        :label="$t('settings.accountName')"
        :rules="[rules.required]"
        prepend-icon="mdi-tag"
        :disabled="isLoading"
      )
    
    v-col(cols="12")
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
    
    v-col(cols="12")
      v-text-field(
        v-model="email"
        :label="$t('settings.integrationEmail')"
        prepend-icon="mdi-email"
        :rules="[rules.required, rules.email]"
        :disabled="isConnected || isLoading"
      )
    
    v-col(cols="12" v-if="accountType === 'exchange'")
      v-text-field(
        v-model="server"
        :label="$t('settings.integrationServer')"
        prepend-icon="mdi-server"
        :rules="[rules.required]"
        :disabled="isConnected || isLoading"
        placeholder="outlook.office365.com"
      )
    
    v-col(cols="12")
      v-text-field(
        v-model="username"
        :label="$t('settings.integrationUsername')"
        prepend-icon="mdi-account"
        :rules="[rules.required]"
        :disabled="isConnected || isLoading"
        :placeholder="usernameHint"
      )
    
    v-col(cols="12" v-if="!isConnected")
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
    
    v-col(cols="12" v-if="isConnected && lastSync")
      v-alert(type="info" variant="tonal")
        | {{ $t('settings.lastSync') }}: {{ formatDate(lastSync) }}
    
    v-col(cols="12")
      v-divider
      
    v-col(cols="12")
      v-subheader {{ $t('settings.syncSettings') }}
    
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
  
  v-row(class="mt-4 mb-4") // Added mb-4 to ensure proper spacing
    template(v-if="!isConnected")
      v-col(cols="12" sm="6")
        v-btn(
          color="primary"
          block
          :loading="isLoading"
          :disabled="!formValid || isLoading"
          @click="testConnection"
        ) 
          v-icon(start) mdi-connection
          | {{ $t('settings.testConnection') }}
      
      v-col(cols="12" sm="6") // Changed to full width on small screens
        v-btn(
          color="success"
          block
          :loading="isLoading"
          :disabled="!formValid || isLoading"
          @click="connectAccount"
        ) 
          v-icon(start) mdi-link
          | {{ $t('settings.connectAccount') }}
    
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

// Form fields
const accountName = ref('')
const accountType = ref('google')
const email = ref('')
const server = ref('')
const username = ref('')
const password = ref('')
const syncCalendar = ref(true)
const syncMail = ref(true)
const syncTasks = ref(true)
const syncContacts = ref(true)
const showInCalendar = ref(true)
const showInMail = ref(true)
const showInTasks = ref(true)
const showInContacts = ref(true)
const color = ref('#1976D2') // Default blue
const lastSync = ref(null)
const isConnected = ref(false)

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

// Load account data if in edit mode
watch(() => props.account, () => {
  if (props.account) {
    accountName.value = props.account.name || ''
    accountType.value = props.account.type || 'google'
    email.value = props.account.email || ''
    server.value = props.account.server || ''
    username.value = props.account.username || ''
    syncCalendar.value = props.account.syncCalendar ?? true
    syncMail.value = props.account.syncMail ?? true
    syncTasks.value = props.account.syncTasks ?? true
    syncContacts.value = props.account.syncContacts ?? true
    showInCalendar.value = props.account.showInCalendar ?? true
    showInMail.value = props.account.showInMail ?? true
    showInTasks.value = props.account.showInTasks ?? true
    showInContacts.value = props.account.showInContacts ?? true
    color.value = props.account.color || '#1976D2'
    lastSync.value = props.account.lastSync || null
    isConnected.value = props.account.connected || false
  }
}, { immediate: true })

// Methods
function getAccountData() {
  // Create a new account object with default values if this is a new account
  if (!props.account) {
    return {
      id: uuidv4(),
      name: accountName.value || `${accountType.value} Account`,
      type: accountType.value,
      email: email.value,
      server: accountType.value === 'exchange' ? server.value : undefined,
      username: username.value,
      password: password.value || undefined, // Only include if provided
      connected: isConnected.value,
      lastSync: lastSync.value,
      syncCalendar: syncCalendar.value,
      syncMail: syncMail.value,
      syncTasks: syncTasks.value,
      syncContacts: syncContacts.value,
      showInCalendar: showInCalendar.value && syncCalendar.value,
      showInMail: showInMail.value && syncMail.value,
      showInTasks: showInTasks.value && syncTasks.value,
      showInContacts: showInContacts.value && syncContacts.value,
      color: color.value,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  // Update existing account
  return {
    ...props.account,
    name: accountName.value,
    type: accountType.value,
    email: email.value,
    server: accountType.value === 'exchange' ? server.value : undefined,
    username: username.value,
    password: password.value || props.account.password, // Keep existing password if not changed
    connected: isConnected.value,
    lastSync: lastSync.value,
    syncCalendar: syncCalendar.value,
    syncMail: syncMail.value,
    syncTasks: syncTasks.value,
    syncContacts: syncContacts.value,
    showInCalendar: showInCalendar.value && syncCalendar.value,
    showInMail: showInMail.value && syncMail.value,
    showInTasks: showInTasks.value && syncTasks.value,
    showInContacts: showInContacts.value && syncContacts.value,
    color: color.value,
    updatedAt: new Date()
  }
}

async function testConnection() {
  if (!formValid.value || !networkStatus.isOnline.value) {
    return
  }
  
  isLoading.value = true
  
  try {
    // Mock a connection test
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Emit test event with account data
    emit('test', getAccountData())
  } catch (err) {
    console.error('Error testing connection:', err)
  } finally {
    isLoading.value = false
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
watch([accountName, accountType, email, server, username, syncCalendar, syncMail, syncTasks, syncContacts, 
       showInCalendar, showInMail, showInTasks, showInContacts, color, isConnected], () => {
  emit('update:account', getAccountData())
}, { deep: true })
</script>
