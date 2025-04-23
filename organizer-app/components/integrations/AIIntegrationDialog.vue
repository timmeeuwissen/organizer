<template lang="pug">
v-dialog(
  v-model="dialogVisible"
  max-width="800px"
  persistent
)
  v-card
    v-card-title 
      | {{ isEditMode ? $t('ai.editIntegration') : $t('ai.addIntegration') }}
      v-spacer
      v-btn(icon @click="close")
        v-icon mdi-close
    
    v-card-text
      v-alert(
        v-if="error" 
        type="error" 
        class="mb-4"
        closable
        @click:close="error = ''"
      ) {{ error }}
      
      v-alert(
        v-if="success" 
        type="success" 
        class="mb-4"
        closable
        @click:close="success = ''"
      ) {{ success }}
      
      v-form(ref="form")
        v-row(align="center")
          v-col(cols="12" md="6")
            v-text-field(
              v-model="integration.name"
              :label="$t('ai.integrationName')"
              :rules="[rules.required]"
              variant="outlined"
              dense
            )
          v-col(cols="12" md="6")
            v-select(
              v-model="integration.provider"
              :items="availableProviders"
              :label="$t('ai.selectIntegrationType')"
              :rules="[rules.required]"
              variant="outlined"
              dense
            )
          v-col(cols="12")
            v-text-field(
              v-model="integration.apiKey"
              :label="$t('ai.apiKey')"
              :hint="getProviderHint(integration.provider)"
              persistent-hint
              variant="outlined"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              :type="showPassword ? 'text' : 'password'"
              :rules="integration.enabled ? [rules.required] : []"
              dense
            )
          v-col(cols="12" class="d-flex align-center")
            v-switch(
              v-model="integration.enabled"
              :label="$t('ai.enabled')"
              color="primary"
              hide-details
            )
        
    v-card-actions
      v-btn(
        color="primary"
        variant="text"
        @click="testIntegration"
        :loading="testing"
        :disabled="!integration.apiKey"
      )
        v-icon(start) mdi-check
        | {{ $t('ai.test') }}
      v-spacer
      v-btn(
        variant="text"
        @click="close"
      ) {{ $t('ai.cancelAddIntegration') }}
      v-btn(
        color="primary"
        @click="save"
        :loading="saving"
      ) {{ $t('ai.saveIntegration') }}
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProvider } from '~/utils/api/aiProviders'
import type { AIIntegrationData, AIProviderType } from '~/types/models/aiIntegration'

// Props and emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  integrationData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

// Component state
const dialogVisible = ref(false)
const form = ref(null)
const error = ref('')
const success = ref('')
const saving = ref(false)
const testing = ref(false)
const showPassword = ref(false)
const i18n = useI18n()

// Available provider types
const availableProviders = [
  { title: 'OpenAI', value: 'openai' },
  { title: 'Google Gemini', value: 'gemini' },
  { title: 'XAI (Grok)', value: 'xai' }
]

// Integration data
const integration = reactive({
  provider: 'openai',
  name: '',
  apiKey: '',
  enabled: true,
  connected: false,
  createdAt: new Date()
})

// Validation rules
const rules = {
  required: v => !!v || i18n.t('validation.required')
}

// Check if we're in edit mode
const isEditMode = computed(() => {
  return props.integrationData && props.integrationData.apiKey
})

// Watch for dialog visibility change
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
  
  if (newVal) {
    // Initialize integration data when dialog opens
    if (props.integrationData) {
      // Copy properties from provided integration data
      Object.assign(integration, JSON.parse(JSON.stringify(props.integrationData)))
    } else {
      // Create new integration with defaults
      Object.assign(integration, {
        provider: 'openai',
        name: i18n.t('ai.newIntegration'),
        apiKey: '',
        enabled: true,
        connected: false,
        createdAt: new Date()
      })
    }
    
    // Show password by default for new integrations
    showPassword.value = !isEditMode.value
  }
})

// Emit update event when dialog visibility changes
watch(() => dialogVisible.value, (newVal) => {
  emit('update:modelValue', newVal)
})

// Get a helpful hint based on the provider type
function getProviderHint(provider) {
  switch (provider) {
    case 'openai':
      return i18n.t('ai.openaiKeyHint')
    case 'gemini':
      return i18n.t('ai.geminiKeyHint')
    case 'xai':
      return i18n.t('ai.xaiKeyHint')
    default:
      return ''
  }
}

// Test the integration
async function testIntegration() {
  if (!integration.apiKey) {
    error.value = i18n.t('ai.missingApiKey')
    return
  }
  
  testing.value = true
  error.value = ''
  success.value = ''
  
  try {
    // Create a properly typed integration object
    const typedIntegration = {
      ...integration,
      provider: integration.provider,
      connected: true
    }
    
    // Get the provider implementation and test the connection
    const provider = getProvider(typedIntegration)
    const result = await provider.testConnection()
    
    if (result) {
      success.value = i18n.t('ai.connectionSuccessful')
      integration.connected = true
    } else {
      error.value = i18n.t('ai.connectionFailed')
      integration.connected = false
    }
  } catch (err) {
    console.error('Integration test error:', err)
    error.value = err.message || i18n.t('ai.connectionError')
    integration.connected = false
  } finally {
    testing.value = false
  }
}

// Save the integration
function save() {
  // Validate form
  if (form.value && !form.value.validate().valid) {
    return
  }
  
  if (!integration.name) {
    error.value = i18n.t('ai.missingName')
    return
  }
  
  if (integration.enabled && !integration.apiKey) {
    error.value = i18n.t('ai.missingApiKeyEnabled')
    return
  }
  
  saving.value = true
  
  try {
    // Update the integration's updatedAt timestamp
    integration.updatedAt = new Date()
    
    // Emit save event with deep copy of integration
    emit('save', JSON.parse(JSON.stringify(integration)))
    
    // Close dialog after successful save
    dialogVisible.value = false
  } catch (err) {
    console.error('Save integration error:', err)
    error.value = err.message || i18n.t('ai.saveError')
  } finally {
    saving.value = false
  }
}

// Close the dialog
function close() {
  // Reset state
  error.value = ''
  success.value = ''
  
  // Close dialog
  dialogVisible.value = false
}
</script>
