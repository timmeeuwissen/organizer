<template lang="pug">
v-container
  v-card
    v-card-title {{ $t('feedback.adminTitle') }}
    v-card-subtitle {{ $t('feedback.adminDescription') }}

    v-card-text
      v-alert(v-if="feedbackStore.error" type="error" density="compact" class="mb-4") {{ feedbackStore.error }}
      
      v-tabs(v-model="activeTab")
        v-tab(value="new") {{ $t('feedback.tabs.new') }}
        v-tab(value="all") {{ $t('feedback.tabs.all') }}
        v-tab(value="approved") {{ $t('feedback.tabs.approved') }}
        v-tab(value="improved") {{ $t('feedback.tabs.improved') }}
        v-tab(value="archived") {{ $t('feedback.tabs.archived') }}
      
      v-window(v-model="activeTab")
        v-window-item(value="new")
          v-data-table(
            :items="feedbackStore.unseenFeedbacks"
            :headers="headers"
            :loading="feedbackStore.loading"
            density="comfortable"
            class="elevation-1"
          )
            template(v-slot:no-data)
              div.pa-4.text-center {{ $t('feedback.noUnseenFeedback') }}
              
            template(v-slot:item.timestamp="{ item }")
              | {{ formatDate(item.timestamp) }}
            
            template(v-slot:item.actions="{ item }")
              v-btn(size="small" @click="viewFeedback(item)" color="primary") {{ $t('feedback.view') }}
        
        v-window-item(value="all")
          v-data-table(
            :items="feedbackStore.feedbacks"
            :headers="headers"
            :loading="feedbackStore.loading"
            density="comfortable"
            class="elevation-1"
          )
            template(v-slot:no-data)
              div.pa-4.text-center {{ $t('feedback.noFeedback') }}
              
            template(v-slot:item.timestamp="{ item }")
              | {{ formatDate(item.timestamp) }}
            
            template(v-slot:item.actions="{ item }")
              v-btn(size="small" @click="viewFeedback(item)" color="primary") {{ $t('feedback.view') }}
                
        v-window-item(value="approved")
          v-data-table(
            :items="feedbackStore.approvedFeedbacks"
            :headers="headers"
            :loading="feedbackStore.loading"
            density="comfortable"
            class="elevation-1"
          )
            template(v-slot:no-data)
              div.pa-4.text-center {{ $t('feedback.noApprovedFeedback') }}
              
            template(v-slot:item.timestamp="{ item }")
              | {{ formatDate(item.timestamp) }}
            
            template(v-slot:item.actions="{ item }")
              v-btn(size="small" @click="viewFeedback(item)" color="primary") {{ $t('feedback.view') }}
                
        v-window-item(value="improved")
          v-data-table(
            :items="feedbackStore.improvedFeedbacks"
            :headers="headers"
            :loading="feedbackStore.loading"
            density="comfortable"
            class="elevation-1"
          )
            template(v-slot:no-data)
              div.pa-4.text-center {{ $t('feedback.noImprovedFeedback') }}
              
            template(v-slot:item.timestamp="{ item }")
              | {{ formatDate(item.timestamp) }}
            
            template(v-slot:item.actions="{ item }")
              v-btn(size="small" @click="viewFeedback(item)" color="primary") {{ $t('feedback.view') }}
                
        v-window-item(value="archived")
          v-data-table(
            :items="feedbackStore.archivedFeedbacks"
            :headers="headers"
            :loading="feedbackStore.loading"
            density="comfortable"
            class="elevation-1"
          )
            template(v-slot:no-data)
              div.pa-4.text-center {{ $t('feedback.noArchivedFeedback') }}
              
            template(v-slot:item.timestamp="{ item }")
              | {{ formatDate(item.timestamp) }}
            
            template(v-slot:item.actions="{ item }")
              v-btn(size="small" @click="viewFeedback(item)" color="primary") {{ $t('feedback.view') }}

  // Feedback Detail Dialog
  v-dialog(v-model="showDetailDialog" max-width="800px")
    v-card(v-if="selectedFeedback")
      v-card-title {{ $t('feedback.detailTitle') }}
      v-card-text
        v-row
          v-col(cols="12")
            p.text-subtitle-1.font-weight-bold {{ $t('feedback.date') }}:
            p {{ formatDate(selectedFeedback.timestamp) }}

            p.text-subtitle-1.font-weight-bold.mt-4 {{ $t('feedback.page') }}:
            p {{ selectedFeedback.page }}

            p.text-subtitle-1.font-weight-bold.mt-4 {{ $t('feedback.message') }}:
            p {{ selectedFeedback.message }}

            div(v-if="selectedFeedback.consoleMessages" class="mt-4")
              p.text-subtitle-1.font-weight-bold {{ $t('feedback.consoleLogs') }}:
              v-card(color="grey-darken-4" class="console-logs pa-2")
                pre.console-text {{ selectedFeedback.consoleMessages }}

            div(v-if="selectedFeedback.screenshot" class="mt-4")
              p.text-subtitle-1.font-weight-bold {{ $t('feedback.screenshot') }}:
              v-img(:src="selectedFeedback.screenshot" max-height="400" contain)

            div.mt-4(v-if="!selectedFeedback.seen")
              p.text-h6 {{ $t('feedback.actionQuestion') }}
              div.d-flex.justify-space-around.my-4
                v-btn(
                  color="success"
                  @click="handleFeedbackAction('yes')"
                ) {{ $t('feedback.actionYes') }}
                
                v-btn(
                  color="error"
                  @click="handleFeedbackAction('no')"
                ) {{ $t('feedback.actionNo') }}
            
            div.mt-4(v-if="selectedFeedback.seen && selectedFeedback.userAction")
              v-chip(
                :color="selectedFeedback.userAction === 'yes' ? 'success' : 'error'"
                text-color="white"
                class="mr-2"
              ) {{ selectedFeedback.userAction === 'yes' ? $t('feedback.markedForAction') : $t('feedback.markedAsIgnored') }}
              
            div.mt-4(v-if="selectedFeedback.userAction === 'yes'")
              p.text-h6 {{ $t('feedback.improvedQuestion') }}
              v-switch(
                v-model="isImproved"
                :label="isImproved ? $t('feedback.markedAsImproved') : $t('feedback.markAsImproved')"
                color="success"
                @update:model-value="handleImprovedChange"
                :disabled="handleImprovedLoading"
              )
              div(v-if="selectedFeedback.improved")
                p.text-caption {{ $t('feedback.improvedAt') }}: {{ formatDate(selectedFeedback.improvedAt) }}
                
            div.mt-6
              p.text-h6 {{ $t('feedback.archiveQuestion') }}
              v-switch(
                v-model="isArchived"
                :label="isArchived ? $t('feedback.unarchive') : $t('feedback.archive')"
                color="warning"
                @update:model-value="handleArchiveChange"
                :disabled="archiveLoading"
              )
              div(v-if="selectedFeedback.archived")
                p.text-caption {{ $t('feedback.archivedAt') }}: {{ formatDate(selectedFeedback.archivedAt) }}
              
            div.mt-4(v-if="selectedFeedback.processedByClaude")
              v-chip(
                color="purple"
                text-color="white"
                class="mr-2"
              ) {{ $t('feedback.processedByClaude') }}
              p.text-caption {{ $t('feedback.processedAt') }}: {{ formatDate(selectedFeedback.processedAt) }}
                
      v-card-actions
        v-spacer
        v-btn(color="primary" @click="showDetailDialog = false") {{ $t('common.close') }}
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedbackStore } from '~/stores/feedback'
import { useAuthStore } from '~/stores/auth'
import type { Feedback } from '~/types/models'

// Stores and composables
const feedbackStore = useFeedbackStore()
const authStore = useAuthStore()
const { t } = useI18n()

// State variables
const activeTab = ref('new')
const showDetailDialog = ref(false)
const selectedFeedback = ref<Feedback | null>(null)

// Table headers
const headers = computed(() => [
  { title: t('feedback.date'), key: 'timestamp', sortable: true },
  { title: t('feedback.page'), key: 'page', sortable: true },
  { title: t('feedback.message'), key: 'message', sortable: true },
  { title: t('feedback.actions'), key: 'actions', sortable: false }
])

// Load feedbacks
onMounted(async () => {
  // Clear any previous errors, safely check if method exists
  if (typeof feedbackStore.clearError === 'function') {
    feedbackStore.clearError()
  } else if (feedbackStore.error) {
    feedbackStore.error = null
  }
  
  if (authStore.user) {
    await feedbackStore.fetchFeedbacks(authStore.user.id)
  }
})

// Format date
function formatDate(date: Date | number | string) {
  if (!date) return ''
  
  const d = new Date(date)
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

// View feedback details
function viewFeedback(feedback: Feedback) {
  // Clear any previous errors, safely check if method exists
  if (typeof feedbackStore.clearError === 'function') {
    feedbackStore.clearError()
  } else if (feedbackStore.error) {
    feedbackStore.error = null
  }
  
  selectedFeedback.value = feedback
  showDetailDialog.value = true
  
  // Mark as seen if it wasn't already
  if (!feedback.seen) {
    feedbackStore.markAsSeen(feedback.id)
  }
}

// Handle feedback action (yes/no)
async function handleFeedbackAction(action: 'yes' | 'no') {
  if (!selectedFeedback.value) return
  
  try {
    await feedbackStore.setUserAction(selectedFeedback.value.id, action)
    
    // Update the selected feedback to reflect the changes
    selectedFeedback.value = {
      ...selectedFeedback.value,
      userAction: action,
      seen: true
    }
  } catch (error) {
    console.error('Error handling feedback action:', error)
  }
}

// Handle improved state toggle
const isImproved = ref(false)
const handleImprovedLoading = ref(false)

// Handle archive toggle
const isArchived = ref(false)
const archiveLoading = ref(false)

// Set initial states when feedback is selected
watch(() => selectedFeedback.value, (feedback) => {
  if (feedback) {
    isImproved.value = !!feedback.improved
    isArchived.value = !!feedback.archived
  }
})

async function handleImprovedChange(value: boolean) {
  if (!selectedFeedback.value) return
  
  handleImprovedLoading.value = true
  try {
    await feedbackStore.markAsImproved(selectedFeedback.value.id, value)
    
    // Update the selected feedback to reflect the changes
    selectedFeedback.value = {
      ...selectedFeedback.value,
      improved: value,
      improvedAt: value ? new Date() : undefined
    }
  } catch (error) {
    console.error('Error updating improved state:', error)
    // Revert switch if there was an error
    isImproved.value = !value
  } finally {
    handleImprovedLoading.value = false
  }
}

async function handleArchiveChange(value: boolean) {
  if (!selectedFeedback.value) return
  
  archiveLoading.value = true
  try {
    await feedbackStore.archiveFeedback(selectedFeedback.value.id, value)
    
    // Update the selected feedback to reflect the changes
    selectedFeedback.value = {
      ...selectedFeedback.value,
      archived: value,
      archivedAt: value ? new Date() : undefined
    }
    
    // If archiving, redirect to the feedback list
    if (value) {
      showDetailDialog.value = false
    }
  } catch (error) {
    console.error('Error updating archive state:', error)
    // Revert switch if there was an error
    isArchived.value = !value
  } finally {
    archiveLoading.value = false
  }
}
</script>

<style scoped>
.console-logs {
  max-height: 150px;
  overflow-y: auto;
}

.console-text {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  color: rgb(240, 240, 240);
  font-size: 0.8rem;
  width: 100%;
}
</style>
