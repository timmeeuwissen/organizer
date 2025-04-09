<template lang="pug">
v-container(class="fill-height" fluid)
  v-row(align="center" justify="center")
    v-col(cols="12" sm="8" md="6" lg="4")
      v-card(class="elevation-12")
        v-toolbar(color="primary" dark)
          v-toolbar-title {{ $t('auth.forgotPassword') }}
        
        v-card-text
          p.mb-4 {{ $t('auth.forgotPasswordInstructions') }}
          
          v-alert(v-if="error" type="error" class="mb-4") {{ error }}
          v-alert(v-if="successMessage" type="success" class="mb-4") {{ successMessage }}
          
          v-form(ref="form" v-model="valid" @submit.prevent="resetPassword")
            v-text-field(
              v-model="email"
              :label="$t('auth.email')"
              prepend-icon="mdi-email"
              type="email"
              :rules="[rules.required, rules.email]"
              :disabled="submitted"
            )
        
        v-card-actions
          v-spacer
          v-btn(
            color="primary"
            :loading="loading"
            :disabled="!valid || loading || submitted"
            @click="resetPassword"
            block
          ) {{ $t('auth.sendResetLink') }}
          
        v-card-text(class="text-center" v-if="!submitted")
          v-btn(
            variant="text" 
            color="primary" 
            to="/auth/login"
          ) {{ $t('auth.backToLogin') }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

const form = ref(null)
const valid = ref(false)
const email = ref('')
const loading = ref(false)
const error = ref('')
const submitted = ref(false)
const successMessage = ref('')

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail must be valid'
}

const resetPassword = async () => {
  error.value = ''
  successMessage.value = ''
  
  if (!valid.value) return
  
  loading.value = true
  
  try {
    const auth = getAuth()
    await sendPasswordResetEmail(auth, email.value)
    
    // Success
    submitted.value = true
    successMessage.value = 'A password reset link has been sent to your email address.'
  } catch (err: any) {
    error.value = 
      err.code === 'auth/user-not-found' 
        ? 'No account found with this email address.' 
        : err.message || 'Failed to send reset email'
  } finally {
    loading.value = false
  }
}
</script>
