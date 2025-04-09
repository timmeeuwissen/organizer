<template>
  <div>
    <!-- This is just a loading container while we determine where to redirect -->
    <v-container class="fill-height" fluid>
      <v-row align="center" justify="center">
        <v-col cols="12" class="text-center">
          <v-progress-circular indeterminate color="primary" size="64" width="4" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// When the component mounts, check auth status and redirect accordingly
onMounted(async () => {
  try {
    // Check if user is authenticated
    await authStore.checkAuth()
    
    if (authStore.isAuthenticated) {
      // If authenticated, go to dashboard
      router.replace('/dashboard')
    } else {
      // If not authenticated, go to login
      router.replace('/auth/login')
    }
  } catch (error) {
    console.error('Authentication check failed:', error)
    // On error, default to login page
    router.replace('/auth/login')
  }
})
</script>
