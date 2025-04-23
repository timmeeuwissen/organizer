<template lang="pug">
.ai-integration-form
  v-card(variant="outlined" class="mb-4")
    v-card-title.d-flex
      span {{ $t('integrations.aiProviders') }}
      v-spacer
      v-btn(
        color="primary"
        size="small"
        @click="addIntegration"
        variant="text"
      )
        v-icon(start) mdi-plus
        | {{ $t('integrations.addProvider') }}
    
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
      
      // No integrations message
      v-alert(
        v-if="!userIntegrations.length"
        type="info"
        variant="tonal"
        class="mb-4"
      ) {{ $t('integrations.noAiProviders') }}
      
      // List of integrations
      v-sheet(
        v-for="(integration, index) in userIntegrations"
        :key="index"
        class="mb-4 pa-4"
        rounded
        outlined
      )
        v-row(align="center")
          v-col(cols="12" md="6")
            v-text-field(
              v-model="integration.name"
              :label="$t('integrations.providerName')"
              variant="outlined"
              dense
            )
          v-col(cols="12" md="6")
            v-select(
              v-model="integration.provider"
              :items="availableProviders"
              :label="$t('integrations.providerType')"
              variant="outlined"
              dense
            )
          v-col(cols="12")
            v-text-field(
              v-model="integration.apiKey"
              :label="$t('integrations.apiKey')"
              :hint="getProviderHint(integration.provider)"
              persistent-hint
              variant="outlined"
              :append-inner-icon="showPassword[index] ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword[index] = !showPassword[index]"
              :type="showPassword[index] ? 'text' : 'password'"
              dense
            )
          v-col(cols="12" class="d-flex align-center")
            v-switch(
              v-model="integration.enabled"
              :label="$t('integrations.enabled')"
              color="primary"
              hide-details
            )
            v-spacer
            v-btn(
              color="error"
              variant="text"
              @click="removeIntegration(index)"
              class="mr-2"
            )
              v-icon mdi-delete
            v-btn(
              color="primary"
              variant="text"
              @click="testIntegration(index)"
              :loading="testing === index"
            )
              v-icon(start) mdi-check
              | {{ $t('integrations.test') }}
    
    v-card-actions
      v-spacer
      v-btn(
        color="primary"
        @click="saveIntegrations"
        :loading="saving"
      ) {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { getProvider } from '~/utils/api/aiProviders'
import type { AIIntegrationData, AIProviderType } from '~/types/models/aiIntegration'

// Props and emits for v-model support
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// Stores and composables
const authStore = useAuthStore()
const i18n = useI18n()

// Component state
const error = ref('')
const success = ref('')
const saving = ref(false)
const testing = ref(-1)
const showPassword = reactive([])

// Available provider types
const availableProviders = [
  { title: 'OpenAI', value: 'openai' },
  { title: 'Google Gemini', value: 'gemini' },
  { title: 'XAI (Grok)', value: 'xai' }
]

// Copy of user integrations for editing
const userIntegrations = ref([])

// Current user data
const user = computed(() => authStore.currentUser)

// Initialize component with user's saved integrations
function initializeIntegrations() {
  userIntegrations.value = []
  showPassword.length = 0
  
  // Use props.modelValue if available, otherwise fall back to user settings
  if (props.modelValue && props.modelValue.length > 0) {
    // Deep copy to avoid modifying props directly
    userIntegrations.value = JSON.parse(JSON.stringify(props.modelValue))
  } else if (user.value?.settings?.aiIntegrations?.length) {
    // Deep copy the integrations to avoid modifying the store directly
    userIntegrations.value = JSON.parse(
      JSON.stringify(user.value.settings.aiIntegrations)
    )
  }
  
  // Initialize the showPassword array
  showPassword.length = userIntegrations.value.length
  showPassword.fill(false)
}

// Flag to prevent recursive updates
const isInternalUpdate = ref(false)

// Initialize on component creation
onMounted(() => {
  initializeIntegrations()
})

// Watch for changes to the modelValue prop
watch(() => props.modelValue, (newValue) => {
  // Skip if this is an internal update
  if (isInternalUpdate.value) return
  
  // Set userIntegrations without triggering the other watcher
  userIntegrations.value = newValue ? JSON.parse(JSON.stringify(newValue)) : []
  
  // Reset showPassword array
  showPassword.length = userIntegrations.value.length
  showPassword.fill(false)
}, { deep: true })

// Watch for changes to userIntegrations and emit update events
watch(userIntegrations, (newValue) => {
  // Set flag to prevent recursive updates
  isInternalUpdate.value = true
  
  // Emit update event
  emit('update:modelValue', JSON.parse(JSON.stringify(newValue)))
  
  // Reset flag after a small delay to ensure the update is processed
  setTimeout(() => {
    isInternalUpdate.value = false
  }, 0)
}, { deep: true })

// Add a new integration
function addIntegration() {
  const newIntegration = {
    provider: 'openai' as AIProviderType,
    name: i18n.t('integrations.newIntegration'),
    apiKey: '',
    enabled: true,
    connected: false,
    createdAt: new Date()
  }
  
  userIntegrations.value.push(newIntegration)
  showPassword.push(true) // Show password by default for new integrations
}

// Remove an integration
function removeIntegration(index) {
  userIntegrations.value.splice(index, 1)
  showPassword.splice(index, 1)
}

// Get a helpful hint based on the provider type
function getProviderHint(provider) {
  switch (provider) {
    case 'openai':
      return i18n.t('integrations.openaiKeyHint')
    case 'gemini':
      return i18n.t('integrations.geminiKeyHint')
    case 'xai':
      return i18n.t('integrations.xaiKeyHint')
    default:
      return ''
  }
}

// Test an integration
async function testIntegration(index) {
  const integration = userIntegrations.value[index]
  
  if (!integration.apiKey) {
    error.value = i18n.t('integrations.missingApiKey')
    return
  }
  
  testing.value = index
  error.value = ''
  success.value = ''
  
  try {
    // Create a properly typed integration object
    const typedIntegration: AIIntegrationData = {
      ...integration,
      provider: integration.provider as AIProviderType,
      connected: true
    }
    
    // Get the provider implementation and test the connection
    const provider = getProvider(typedIntegration)
    const result = await provider.testConnection()
    
    if (result) {
      success.value = i18n.t('integrations.connectionSuccessful')
      integration.connected = true
    } else {
      error.value = i18n.t('integrations.connectionFailed')
      integration.connected = false
    }
  } catch (err) {
    console.error('Integration test error:', err)
    error.value = err.message || i18n.t('integrations.connectionError')
    integration.connected = false
  } finally {
    testing.value = -1
  }
}

// Save all integrations
async function saveIntegrations() {
  // Validate integrations
  for (const integration of userIntegrations.value) {
    if (!integration.name) {
      error.value = i18n.t('integrations.missingName')
      return
    }
    
    if (integration.enabled && !integration.apiKey) {
      error.value = i18n.t('integrations.missingApiKeyEnabled')
      return
    }
  }
  
  saving.value = true
  error.value = ''
  success.value = ''
  
  try {
    // Update user settings with the new integrations
    await authStore.updateUserSettings({
      aiIntegrations: userIntegrations.value
    })
    
    success.value = i18n.t('integrations.saveSuccess')
  } catch (err) {
    console.error('Save integrations error:', err)
    error.value = err.message || i18n.t('integrations.saveError')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ai-integration-form {
  max-width: 800px;
  margin: 0 auto;
}
</style>
