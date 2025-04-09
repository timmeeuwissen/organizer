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
        :account="currentAccount"
        :isEditMode="isEditMode"
        @save="handleSave"
        @test="handleTest"
        @sync="handleSync"
        @disconnect="handleDisconnect"
        @update:account="handleUpdate"
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
const currentAccount = ref(null)
const originalAccount = ref(null)
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
  if (!currentAccount.value || !originalAccount.value) return false
  
  // Compare JSON representations to detect changes
  return JSON.stringify(currentAccount.value) !== JSON.stringify(originalAccount.value)
})

// Watchers
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
  
  // Initialize form when dialog opens
  if (newVal) {
    // Deep clone to avoid modifying props directly
    if (props.account) {
      originalAccount.value = JSON.parse(JSON.stringify(props.account))
      currentAccount.value = JSON.parse(JSON.stringify(props.account))
    } else {
      originalAccount.value = null
      currentAccount.value = null
    }
    
    // Clear messages
    errorMsg.value = ''
    successMsg.value = ''
  }
}, { immediate: true })

watch(() => dialogVisible.value, (newVal) => {
  emit('update:modelValue', newVal)
})

// Methods
function close() {
  dialogVisible.value = false
  currentAccount.value = null
  originalAccount.value = null
  errorMsg.value = ''
  successMsg.value = ''
}

function handleUpdate(account) {
  currentAccount.value = account
}

function handleTest(account) {
  errorMsg.value = ''
  successMsg.value = ''
  
  // Mock a connection test
  setTimeout(() => {
    const success = Math.random() > 0.2 // 80% success rate for testing
    
    if (success) {
      successMsg.value = i18n.t('settings.connectionSuccessful')
      emit('test', account)
      setTimeout(() => {
        successMsg.value = ''
      }, 3000)
    } else {
      errorMsg.value = i18n.t('settings.connectionFailed')
      setTimeout(() => {
        errorMsg.value = ''
      }, 3000)
    }
  }, 1000)
}

function handleSave(account) {
  currentAccount.value = account
  saveAccount()
}

function handleSync(account) {
  currentAccount.value = account
  successMsg.value = i18n.t('settings.connectionSuccessful')
  setTimeout(() => {
    successMsg.value = ''
  }, 3000)
}

function handleDisconnect(account) {
  currentAccount.value = account
  successMsg.value = i18n.t('settings.disconnected')
  setTimeout(() => {
    successMsg.value = ''
  }, 3000)
}

async function connectAndClose() {
  if (!currentAccount.value) return
  
  isSaving.value = true
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    // Make sure we have a valid account object with all required fields
    if (!currentAccount.value.id) {
      console.error('Missing account ID')
      throw new Error('Account ID is required')
    }
    
    if (!currentAccount.value.name || !currentAccount.value.email || !currentAccount.value.type) {
      console.error('Missing required account fields')
      throw new Error('Name, email and account type are required')
    }
    
    // Always ensure connected status is set to true when saving
    currentAccount.value.connected = true
    
    // Set lastSync if it doesn't exist
    if (!currentAccount.value.lastSync) {
      currentAccount.value.lastSync = new Date()
    }
    
    // Brief delay to simulate saving
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Filter out any undefined values that might cause Firestore errors
    const safeAccount = { ...currentAccount.value }
    Object.keys(safeAccount).forEach(key => {
      if (safeAccount[key] === undefined) {
        delete safeAccount[key]
      }
    })
    
    // Send the cleaned account data to parent component
    emit('save', safeAccount)
    
    // Show success message
    successMsg.value = isEditMode.value
      ? 'Integration account updated successfully'
      : 'Integration account added successfully'
    
    // Briefly show success message before closing
    setTimeout(() => {
      dialogVisible.value = false
    }, 1000)
  } catch (err) {
    console.error('Error saving account:', err)
    errorMsg.value = err.message || 'Error saving account'
  } finally {
    isSaving.value = false
  }
}

async function saveAccount() {
  if (!currentAccount.value) return
  
  isSaving.value = true
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    // Make sure we have a valid account object with all required fields
    if (!currentAccount.value.id) {
      console.error('Missing account ID')
      throw new Error('Account ID is required')
    }
    
    if (!currentAccount.value.name || !currentAccount.value.email || !currentAccount.value.type) {
      console.error('Missing required account fields')
      throw new Error('Name, email and account type are required')
    }
    
    // Brief delay to simulate saving
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Send the account data to parent component
    emit('save', currentAccount.value)
    
    // Show success message but keep dialog open until parent confirms save
    successMsg.value = isEditMode.value
      ? 'Integration account updated successfully'
      : 'Integration account added successfully'
  } catch (err) {
    console.error('Error saving account:', err)
    errorMsg.value = err.message || 'Error saving account'
  } finally {
    isSaving.value = false
  }
}
</script>
