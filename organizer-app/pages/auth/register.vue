<template lang="pug">
v-container(class="fill-height" fluid)
  v-row(align="center" justify="center")
    v-col(cols="12" sm="8" md="6" lg="4")
      v-card(class="elevation-12")
        v-toolbar(color="primary" dark)
          v-toolbar-title {{ $t('auth.register') }}
        
        v-card-text
          v-alert(v-if="error" type="error" class="mb-4") {{ error }}
          v-form(ref="form" v-model="valid" @submit.prevent="register")
            v-text-field(
              v-model="name"
              :label="$t('people.name')"
              prepend-icon="mdi-account"
              :rules="[rules.required]"
            )
            v-text-field(
              v-model="email"
              :label="$t('auth.email')"
              prepend-icon="mdi-email"
              type="email"
              :rules="[rules.required, rules.email]"
            )
            v-text-field(
              v-model="password"
              :label="$t('auth.password')"
              prepend-icon="mdi-lock"
              :type="showPassword ? 'text' : 'password'"
              :rules="[rules.required, rules.minLength]"
              :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append="showPassword = !showPassword"
            )
            v-text-field(
              v-model="confirmPassword"
              :label="$t('auth.confirmPassword')"
              prepend-icon="mdi-lock-check"
              :type="showConfirmPassword ? 'text' : 'password'"
              :rules="[rules.required, passwordMatch]"
              :append-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append="showConfirmPassword = !showConfirmPassword"
            )
        
        v-card-actions
          v-spacer
          v-btn(
            color="primary"
            :loading="loading"
            :disabled="!valid || loading"
            @click="register"
            block
          ) {{ $t('auth.register') }}
          
        v-card-text(class="text-center")
          v-btn(
            variant="text"
            color="primary"
            @click="registerWithGoogle"
            :loading="loading"
            :disabled="loading"
            prepend-icon="mdi-google"
            class="mb-2"
          ) {{ $t('auth.googleRegister') }}
          
          v-divider(class="my-3")
          
          div {{ $t('auth.haveAccount') }}
            v-btn(
              variant="text" 
              color="primary" 
              to="/auth/login"
              class="ml-1"
            ) {{ $t('auth.login') }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const form = ref(null)
const valid = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail must be valid',
  minLength: (v: string) => v.length >= 6 || 'Password must be at least 6 characters'
}

const passwordMatch = (v: string) => v === password.value || 'Passwords do not match'

const register = async () => {
  error.value = ''
  if (!valid.value) return
  
  try {
    loading.value = true
    await authStore.registerWithEmail(email.value, password.value)
    
    // Navigate to dashboard after successful registration
    router.push('/dashboard')
  } catch (err: any) {
    error.value = err.message || 'Failed to register'
  } finally {
    loading.value = false
  }
}

const registerWithGoogle = async () => {
  error.value = ''
  
  try {
    loading.value = true
    await authStore.loginWithGoogle() // Use the same Google auth for registration
    
    // Navigate to dashboard after successful registration
    router.push('/dashboard')
  } catch (err: any) {
    error.value = err.message || 'Failed to register with Google'
  } finally {
    loading.value = false
  }
}
</script>
