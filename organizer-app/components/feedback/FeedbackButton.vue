<template lang="pug">
div
  v-btn(
    :icon="showFeedbackForm ? 'mdi-close' : 'mdi-message-text-outline'"
    color="primary"
    size="small"
    @click="toggleFeedbackForm"
    class="feedback-button"
    :title="$t('feedback.button')"
  )
  
  v-dialog(v-model="showFeedbackForm" max-width="700px")
    v-card
      v-card-title {{ $t('feedback.title') }}
      v-card-text
        v-form(ref="form" v-model="isFormValid" @submit.prevent="submitFeedback")
          v-textarea(
            v-model="feedbackText"
            :label="$t('feedback.messageLabel')"
            :placeholder="$t('feedback.messagePlaceholder')"
            :rules="[v => !!v || $t('feedback.messageRequired')]"
            rows="4"
            counter
            auto-grow
            required
          )
          v-checkbox(
            v-model="includeScreenshot"
            :label="$t('feedback.includeScreenshot')"
          )
          v-checkbox(
            v-model="includeConsoleLogs"
            :label="$t('feedback.includeConsoleLogs')"
          )
          
          div(v-if="includeScreenshot && screenshotPreview" class="mt-3")
            p.text-subtitle-2 {{ $t('feedback.screenshotPreview') }}:
            v-img(:src="screenshotPreview" max-height="250" contain)
      
      v-card-actions
        v-spacer
        v-btn(color="grey" text @click="showFeedbackForm = false") {{ $t('common.cancel') }}
        v-btn(
          color="primary"
          @click="submitFeedback"
          :loading="submitting"
          :disabled="!isFormValid || submitting"
        ) {{ $t('feedback.submit') }}
        
  v-snackbar(v-model="showSnackbar" :timeout="4000")
    | {{ snackbarText }}
    template(v-slot:actions)
      v-btn(color="white" text @click="showSnackbar = false") {{ $t('common.close') }}
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useFeedbackStore } from '~/stores/feedback'
import { useRoute } from 'vue-router'

// Stores
const authStore = useAuthStore()
const feedbackStore = useFeedbackStore()
const route = useRoute()

// Form data
const form = ref<any>(null)
const feedbackText = ref('')
const isFormValid = ref(false)
const includeScreenshot = ref(true)
const includeConsoleLogs = ref(true)
const screenshotPreview = ref<string | null>(null)
const showFeedbackForm = ref(false)
const submitting = ref(false)

// Snackbar
const showSnackbar = ref(false)
const snackbarText = ref('')

// Console logs cache
const consoleLogsCache = ref<string[]>([])
const MAX_CONSOLE_LOGS = 10
let originalConsoleLog: any = null
let originalConsoleError: any = null
let originalConsoleWarn: any = null
let originalConsoleInfo: any = null

// Setup console logs capturing
onMounted(() => {
  setupConsoleCapture()
})

onBeforeUnmount(() => {
  restoreConsole()
})

// Capture console logs
function setupConsoleCapture() {
  // Store original console methods
  originalConsoleLog = console.log
  originalConsoleError = console.error
  originalConsoleWarn = console.warn
  originalConsoleInfo = console.info
  
  // Override console.log
  console.log = function() {
    // Call the original function
    originalConsoleLog.apply(console, arguments)
    
    // Store in our cache
    const args = Array.from(arguments)
    const logString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    
    addToConsoleCache(`[LOG] ${logString}`)
  }
  
  // Override console.error
  console.error = function() {
    // Call the original function
    originalConsoleError.apply(console, arguments)
    
    // Store in our cache
    const args = Array.from(arguments)
    const logString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    
    addToConsoleCache(`[ERROR] ${logString}`)
  }
  
  // Override console.warn
  console.warn = function() {
    // Call the original function
    originalConsoleWarn.apply(console, arguments)
    
    // Store in our cache
    const args = Array.from(arguments)
    const logString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    
    addToConsoleCache(`[WARN] ${logString}`)
  }
  
  // Override console.info
  console.info = function() {
    // Call the original function
    originalConsoleInfo.apply(console, arguments)
    
    // Store in our cache
    const args = Array.from(arguments)
    const logString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    
    addToConsoleCache(`[INFO] ${logString}`)
  }
}

// Restore original console methods
function restoreConsole() {
  if (originalConsoleLog) console.log = originalConsoleLog
  if (originalConsoleError) console.error = originalConsoleError
  if (originalConsoleWarn) console.warn = originalConsoleWarn
  if (originalConsoleInfo) console.info = originalConsoleInfo
}

// Add to console cache, keeping only the last MAX_CONSOLE_LOGS
function addToConsoleCache(log: string) {
  consoleLogsCache.value.push(log)
  
  // Keep only the last MAX_CONSOLE_LOGS
  if (consoleLogsCache.value.length > MAX_CONSOLE_LOGS) {
    consoleLogsCache.value = consoleLogsCache.value.slice(-MAX_CONSOLE_LOGS)
  }
}

// Toggle feedback form
async function toggleFeedbackForm() {
  if (!showFeedbackForm.value) {
    // Take screenshot first before showing the form
    await takeScreenshot()
    
    // Reset form
    resetForm()
    
    // Now show the form after screenshot is taken
    showFeedbackForm.value = true
  } else {
    // Just hide the form when closing
    showFeedbackForm.value = false
  }
}

// Reset the form
function resetForm() {
  feedbackText.value = ''
  includeScreenshot.value = true
  includeConsoleLogs.value = true
}

// Take a screenshot of the current page
async function takeScreenshot() {
  try {
    // Use html2canvas to take a screenshot
    // This requires importing the library
    const html2canvas = (await import('html2canvas')).default
    
    // Exclude the feedback form itself from the screenshot
    const dialogElements = document.querySelectorAll('.v-dialog--active')
    const originalDisplay: string[] = []
    
    // Temporarily hide dialogs for the screenshot
    dialogElements.forEach((el: any) => {
      originalDisplay.push(el.style.display)
      el.style.display = 'none'
    })
    
    const canvas = await html2canvas(document.body)
    const dataUrl = canvas.toDataURL('image/png')
    screenshotPreview.value = dataUrl
    
    // Restore dialog visibility
    dialogElements.forEach((el: any, i: number) => {
      el.style.display = originalDisplay[i] || ''
    })
  } catch (e) {
    console.error('Error taking screenshot:', e)
    screenshotPreview.value = null
  }
}

// Submit feedback
async function submitFeedback() {
  if (!form.value) return
  
  // Validate form
  const { valid } = await form.value.validate()
  if (!valid || !authStore.user) return
  
  submitting.value = true
  
  try {
    // Clear any previous errors, safely check if method exists
    if (typeof feedbackStore.clearError === 'function') {
      feedbackStore.clearError()
    } else if (feedbackStore.error) {
      feedbackStore.error = null
    }
    
    // Format console logs to a maximum of 256 characters, handling circular references
    let consoleLogs = '';
    if (includeConsoleLogs.value) {
      try {
        // Safely convert console logs to string, avoiding circular references
        consoleLogs = consoleLogsCache.value
          .map(log => {
            try { return log; }
            catch (e) { return '[Unable to stringify log]'; }
          })
          .join('\n')
          .substring(0, 256);
      } catch (e) {
        consoleLogs = '[Error processing console logs]';
      }
    }
    
    // Create feedback object
    const feedback = {
      userId: authStore.user.id,
      message: feedbackText.value,
      screenshot: includeScreenshot.value && screenshotPreview.value ? screenshotPreview.value : '',
      consoleMessages: consoleLogs,
      timestamp: new Date(),
      page: route.fullPath
    }
    
    // Save to store/backend
    const result = await feedbackStore.addFeedback(feedback)
    
    // Only show success message if no errors
    if (result && !feedbackStore.error) {
      snackbarText.value = 'Feedback submitted successfully!'
      showSnackbar.value = true
      
      // Close form
      showFeedbackForm.value = false
    } else if (feedbackStore.error) {
      // Show error in snackbar
      snackbarText.value = feedbackStore.error || 'Failed to submit feedback. Please try again.'
      showSnackbar.value = true
    }
  } catch (e) {
    console.error('Error submitting feedback:', e)
    snackbarText.value = 'Failed to submit feedback. Please try again.'
    showSnackbar.value = true
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.feedback-button {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1000;
}
</style>
