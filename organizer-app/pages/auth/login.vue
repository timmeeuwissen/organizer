<template lang="pug">
v-container(class="fill-height" fluid)
  v-row(align="center" justify="center")
    v-col(cols="12" sm="8" md="6" lg="4")
      v-card(class="elevation-12")
        v-toolbar(color="primary" dark)
          v-toolbar-title {{ $t('auth.login') }}
        
        v-card-text
          v-alert(v-if="error" type="error" class="mb-4") {{ error }}
          v-form(ref="form" v-model="valid" @submit.prevent="login")
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
              :rules="[rules.required]"
              :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append="showPassword = !showPassword"
            )
            v-checkbox(
              v-model="rememberMe"
              :label="$t('auth.rememberMe')"
              color="primary"
            )
        
        v-card-actions
          v-btn(
            color="primary"
            :loading="loading"
            :disabled="!valid || loading"
            @click="login"
            block
          ) {{ $t('auth.login') }}
          
        v-card-text(class="text-center")
          v-btn(
            variant="text"
            color="primary"
            @click="loginWithGoogle"
            :loading="loading"
            :disabled="loading"
            prepend-icon="mdi-google"
            class="mb-2"
          ) {{ $t('auth.googleLogin') }}
          
          v-divider(class="my-3")
          
          v-btn(
            variant="text" 
            to="/auth/forgot-password"
            class="mb-2"
          ) {{ $t('auth.forgotPassword') }}
          
          div {{ $t('auth.noAccount') }}
            v-btn(
              variant="text" 
              color="primary" 
              to="/auth/register"
              class="ml-1"
            ) {{ $t('auth.register') }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = ref(null)
const valid = ref(false)
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const loading = ref(false)
const error = ref('')

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail must be valid'
}

const login = async () => {
  error.value = ''
  if (!valid.value) return
  
  try {
    loading.value = true
    await authStore.loginWithEmail(email.value, password.value)
    
    // Navigate to the redirect URL or dashboard
    const redirectPath = route.query.redirect as string || '/dashboard'
    router.push(redirectPath)
  } catch (err: any) {
    error.value = err.message || 'Failed to login'
  } finally {
    loading.value = false
  }
}

const loginWithGoogle = async () => {
  error.value = ''
  
  try {
    loading.value = true
    await authStore.loginWithGoogle()
    
    // Navigate to the redirect URL or dashboard
    const redirectPath = route.query.redirect as string || '/dashboard'
    router.push(redirectPath)
  } catch (err: any) {
    error.value = err.message || 'Failed to login with Google'
  } finally {
    loading.value = false
  }
}
</script>
