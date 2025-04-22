<template lang="pug">
div.ai-integration-form
  // Header with add button
  v-card-title 
    | {{ $t('ai.aiIntegrations') }}
    v-spacer
    v-btn(
      color="primary" 
      icon
      @click="showAddDialog = true"
      :disabled="isSaving"
    )
      v-icon mdi-plus
  
  v-alert(v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable @click:close="errorMessage = ''") {{ errorMessage }}
  v-alert(v-if="successMessage" type="success" variant="tonal" class="mb-3" closable @click:close="successMessage = ''") {{ successMessage }}
  
  // If no integrations, show empty state
  template(v-if="modelValue.length === 0")
    v-alert(type="info" variant="tonal" class="mt-3")
      | {{ $t('ai.noAIIntegrations') }}
      div.text-center.mt-3
        v-btn(
          color="primary"
          @click="showAddDialog = true"
          :disabled="isSaving"
        ) {{ $t('ai.addYourFirstAIIntegration') }}
  
  // If integrations exist, show them in a list
  template(v-else)
    v-sheet(class="px-2 mb-4")
      v-list
        v-list-item(
          v-for="(integration, index) in modelValue"
          :key="integration.provider"
          :title="integration.name"
          :subtitle="getProviderLabel(integration.provider) + (integration.lastUsed ? ` • ${$t('settings.lastSync')}: ${formatDate(integration.lastUsed)}` : '')"
        )
          template(v-slot:prepend)
            v-avatar(color="primary" size="36")
              v-icon(color="white") {{ getProviderIcon(integration.provider) }}
          
          template(v-slot:append)
            // Connection status chip
            v-chip(
              size="small"
              class="mr-2"
              :color="integration.connected ? 'success' : 'error'"
              variant="outlined"
            ) {{ integration.connected ? $t('settings.connected') : $t('settings.disconnected') }}
            
            // Toggle for enabled/disabled
            v-switch(
              v-model="integration.enabled"
              color="primary"
              density="compact"
              hide-details
              @change="updateIntegration(index)"
            )
            
            // Edit button
            v-btn(
              icon
              variant="text"
              size="small"
              color="default"
              @click="editIntegration(index)"
              :title="$t('common.edit')"
            )
              v-icon mdi-pencil
            
            // Delete button
            v-btn(
              icon
              variant="text"
              size="small"
              color="error"
              @click="confirmDeleteIntegration(index)"
              :title="$t('common.delete')"
            )
              v-icon mdi-delete
  
  // Add/Edit dialog
  v-dialog(v-model="showAddDialog" max-width="600px" persistent)
    v-card
      v-card-title {{ isEditing ? $t('ai.editAIIntegration') : $t('ai.addAIIntegration') }}
      
      v-card-text
        v-form(ref="form" @submit.prevent="saveIntegration")
          // If not editing, show provider selection
          v-select(
            v-if="!isEditing"
            v-model="editedIntegration.provider"
            :items="availableProviders"
            :label="$t('ai.aiProvider')"
            item-title="text"
            item-value="value"
            :rules="[rules.required]"
            variant="outlined"
          )
            template(v-slot:item="{ item, props }")
              v-list-item(v-bind="props")
                template(v-slot:prepend)
                  v-avatar(color="primary" size="36")
                    v-icon(color="white") {{ item.raw.icon }}
                v-list-item-title {{ item.raw.text }}
                v-list-item-subtitle {{ item.raw.hint }}
          
          // Provider is read-only if editing
          v-text-field(
            v-else
            :value="getProviderLabel(editedIntegration.provider)"
            :label="$t('ai.aiProvider')"
            variant="outlined"
            readonly
            disabled
            :prepend-icon="getProviderIcon(editedIntegration.provider)"
          )
          
          // Name field
          v-text-field(
            v-model="editedIntegration.name"
            :label="$t('ai.integrationName')"
            variant="outlined"
            :rules="[rules.required]"
          )
          
          // API Key field for all providers
          v-text-field(
            v-model="editedIntegration.apiKey"
            :label="$t('ai.apiKey')"
            variant="outlined"
            :type="showApiKey ? 'text' : 'password'"
            :rules="[rules.required]"
            :append-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append="showApiKey = !showApiKey"
          )
          
          // Helper text for different providers
          v-sheet(class="text-caption mb-4" v-if="editedIntegration.provider === 'xai'")
            | Enter your XAI API key. Contact your administrator if you don't have one.
          
          v-sheet(class="text-caption mb-4" v-if="editedIntegration.provider === 'openai'")
            | Visit 
            a(href="https://platform.openai.com/api-keys" target="_blank" class="text-decoration-none") platform.openai.com/api-keys 
            | to generate an API key
          
          v-sheet(class="text-caption mb-4" v-if="editedIntegration.provider === 'gemini'")
            | Visit 
            a(href="https://ai.google.dev/" target="_blank" class="text-decoration-none") ai.google.dev 
            | to get your API key
          
          // Test connection button
          v-btn(
            color="secondary"
            variant="outlined"
            class="mb-4 mt-2"
            :loading="isTestingConnection"
            @click.prevent="testConnection"
            :disabled="!editedIntegration.apiKey"
            type="button"
          )
            v-icon(left) mdi-connection
            | {{ $t('settings.testConnection') }}
          
          // Connection status message
          v-alert(
            v-if="connectionStatus"
            :type="connectionStatus.success ? 'success' : 'error'"
            variant="tonal"
            class="mt-2 mb-3"
            density="compact"
          ) {{ connectionStatus.message }}
          
          // Enabled toggle
          v-switch(
            v-model="editedIntegration.enabled"
            :label="$t('ai.enabled')"
            color="primary"
          )
      
      v-card-actions
        v-spacer
        v-btn(
          variant="text"
          @click="showAddDialog = false"
          :disabled="isSaving"
        ) {{ $t('common.cancel') }}
        
        v-btn(
          color="primary"
          @click="saveIntegration"
          :loading="isSaving"
          :disabled="!isFormValid"
        ) {{ $t('common.save') }}
  
  // Delete confirmation dialog
  v-dialog(v-model="showDeleteDialog" max-width="400px")
    v-card
      v-card-title {{ $t('common.delete') }} {{ modelValue[selectedIndex]?.name }}?
      v-card-text {{ $t('ai.deleteAIIntegrationConfirmation') }}
      v-card-actions
        v-spacer
        v-btn(
          variant="text"
          @click="showDeleteDialog = false"
        ) {{ $t('common.cancel') }}
        v-btn(
          color="error"
          @click="deleteIntegration"
          :loading="isSaving"
        ) {{ $t('common.delete') }}
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProvider } from '~/utils/api/aiProviders'

// Props and emits
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const i18n = useI18n()

// Form state
const form = ref(null)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const isEditing = ref(false)
const selectedIndex = ref(-1)
const isSaving = ref(false)
const isTestingConnection = ref(false)
const showApiKey = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const connectionStatus = ref(null)

// Default integration data
const defaultIntegration = {
  provider: '',
  name: '',
  apiKey: '',
  enabled: true,
  connected: false,
  lastUsed: null
}

// Edited integration
const editedIntegration = reactive({ ...defaultIntegration })

// Available AI providers
const availableProviders = [
  { 
    text: 'XAI', 
    value: 'xai', 
    icon: 'mdi-robot',
    hint: i18n.t('ai.xaiHint')
  },
  { 
    text: 'OpenAI', 
    value: 'openai', 
    icon: 'mdi-brain',
    hint: i18n.t('ai.openaiHint')
  },
  { 
    text: 'Google Gemini', 
    value: 'gemini', 
    icon: 'mdi-google',
    hint: i18n.t('ai.geminiHint')
  }
]

// Validation rules
const rules = {
  required: v => !!v || i18n.t('validation.required')
}

// Check if form is valid
const isFormValid = computed(() => {
  if (!editedIntegration.name) return false
  if (!editedIntegration.apiKey) return false
  return true
})

// Helper functions
function getProviderLabel(provider) {
  const found = availableProviders.find(p => p.value === provider)
  return found ? found.text : provider
}

function getProviderIcon(provider) {
  const found = availableProviders.find(p => p.value === provider)
  return found ? found.icon : 'mdi-help-circle'
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

// Edit an existing integration
function editIntegration(index) {
  selectedIndex.value = index
  isEditing.value = true
  
  // Clone the integration to edit
  const integration = props.modelValue[index]
  Object.assign(editedIntegration, JSON.parse(JSON.stringify(integration)))
  
  showAddDialog.value = true
}

// Add a new integration
function addIntegration() {
  console.log("Add integration clicked")  // Debug log
  isEditing.value = false
  selectedIndex.value = -1
  
  // Reset to default values
  Object.assign(editedIntegration, defaultIntegration)
  
  showAddDialog.value = true
}

// Save the edited/new integration
async function saveIntegration() {
  if (!isFormValid.value) return
  
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Create a new array to avoid mutation warnings
    const updatedIntegrations = [...props.modelValue]
    
    // Check if we're adding a new provider that already exists
    if (!isEditing.value) {
      const existingProvider = updatedIntegrations.findIndex(
        i => i.provider === editedIntegration.provider
      )
      
      if (existingProvider >= 0) {
        errorMessage.value = i18n.t('ai.providerAlreadyExists')
        isSaving.value = false
        return
      }
      
      // Add new integration
      updatedIntegrations.push({
        ...editedIntegration,
        createdAt: new Date()
      })
      
      successMessage.value = i18n.t('ai.aiIntegrationAdded')
    } else {
      // Update existing integration
      updatedIntegrations[selectedIndex.value] = {
        ...editedIntegration,
        updatedAt: new Date()
      }
      
      successMessage.value = i18n.t('ai.aiIntegrationUpdated')
    }
    
    console.log('Saving AI Integrations:', updatedIntegrations)
    
    // Emit the updated array
    emit('update:modelValue', updatedIntegrations)
    
    // Close the dialog
    showAddDialog.value = false
  } catch (error) {
    console.error('Error saving AI integration:', error)
    errorMessage.value = error.message || 'Failed to save AI integration'
  } finally {
    isSaving.value = false
  }
}

// Update a single integration (for toggles)
function updateIntegration(index) {
  const updatedIntegrations = [...props.modelValue]
  updatedIntegrations[index] = {
    ...updatedIntegrations[index],
    updatedAt: new Date()
  }
  
  emit('update:modelValue', updatedIntegrations)
}

// Confirm deletion of an integration
function confirmDeleteIntegration(index) {
  selectedIndex.value = index
  showDeleteDialog.value = true
}

// Test connection with current API key
async function testConnection() {
  console.log("Test connection button clicked!")
  if (!editedIntegration.apiKey) {
    console.log("No API key provided, aborting test")
    return
  }
  
  isTestingConnection.value = true
  connectionStatus.value = null
  
  try {
    console.log(`Testing connection for ${editedIntegration.provider} with API key ${editedIntegration.apiKey.substring(0, 3)}...`)
    
    // Create a temporary integration object for testing
    const tempIntegration = {
      provider: editedIntegration.provider,
      name: 'Test Connection',
      apiKey: editedIntegration.apiKey,
      enabled: true,
      connected: false
    }
    
    // Get provider implementation and test connection
    const aiProvider = getProvider(tempIntegration)
    const success = await aiProvider.testConnection()
    
    // Update the connection status based on the result
    editedIntegration.connected = success
    
    if (success) {
      connectionStatus.value = {
        success: true,
        message: i18n.t('settings.connectionSuccessful')
      }
    } else {
      throw new Error('Invalid API key or service unavailable')
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    connectionStatus.value = {
      success: false,
      message: i18n.t('settings.connectionFailed') + ': ' + (error.message || 'Unknown error')
    }
  } finally {
    isTestingConnection.value = false
  }
}

// Delete an integration
function deleteIntegration() {
  isSaving.value = true
  
  try {
    const updatedIntegrations = props.modelValue.filter((_, i) => i !== selectedIndex.value)
    emit('update:modelValue', updatedIntegrations)
    
    successMessage.value = i18n.t('ai.aiIntegrationDeleted')
    showDeleteDialog.value = false
  } catch (error) {
    console.error('Error deleting AI integration:', error)
    errorMessage.value = error.message || 'Failed to delete AI integration'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.ai-integration-form {
  width: 100%;
}
</style>
