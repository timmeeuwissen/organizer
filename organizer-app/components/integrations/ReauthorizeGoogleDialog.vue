<template lang="pug">
v-dialog(
  v-model="dialog"
  width="500"
  persistent
)
  v-card
    v-card-title(class="text-h5") {{ $t('integrations.reauthorizeNeeded') }}
    v-card-text
      p {{ $t('integrations.googleTokenExpired') }}
      p {{ $t('integrations.reauthorizeInstructions') }}
      
    v-card-actions
      v-spacer
      v-btn(color="primary" variant="tonal" @click="dialog = false") {{ $t('common.cancel') }}
      google-auth-button(
        color="error"
        :text="$t('integrations.reauthorize')"
        @auth-success="handleGoogleAuthSuccess"
        @auth-error="handleGoogleAuthError"
      )
</template>

<script setup>
import { ref, watch } from 'vue'
import GoogleAuthButton from './GoogleAuthButton.vue'

const props = defineProps({
  account: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['auth-success', 'auth-error', 'closed'])

const dialog = ref(false)

// Expose method to open dialog
const open = () => {
  dialog.value = true
}

// Handle Google auth success
function handleGoogleAuthSuccess(tokens) {
  console.log('Google reauthorization successful')
  emit('auth-success', {
    ...tokens,
    accountId: props.account.id
  })
  dialog.value = false
}

// Handle Google auth error
function handleGoogleAuthError(error) {
  console.error('Google reauthorization error:', error)
  emit('auth-error', error)
  dialog.value = false
}

// Watch for dialog close and emit event
watch(dialog, (newValue) => {
  if (!newValue) {
    emit('closed')
  }
})

// Expose methods
defineExpose({
  open
})
</script>
