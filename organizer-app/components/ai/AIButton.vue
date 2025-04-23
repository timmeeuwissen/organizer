<template lang="pug">
div.ai-button
  v-btn(
    icon 
    color="primary"
    v-if="showButton"
    @click="showDialog = true"
    :title="$t('ai.analyzeText')"
  )
    v-icon mdi-brain
  
  // AI Analysis Dialog
  AIAnalysisDialog(v-model="showDialog")
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import AIAnalysisDialog from '~/components/ai/AIAnalysisDialog.vue'
// Import the isValidIntegration helper to check if integrations are usable
import { isValidIntegration } from '~/utils/api/aiProviders'

// Store
const authStore = useAuthStore()

// Component state
const showDialog = ref(false)

// Computed state
const user = computed(() => authStore.currentUser)

// Only show the button if the user has at least one valid AI integration
const showButton = computed(() => {
  if (!user.value || !user.value.settings || !user.value.settings.aiIntegrations) {
    return false
  }
  
  return user.value.settings.aiIntegrations.some(integration => 
    isValidIntegration(integration)
  )
})
</script>
