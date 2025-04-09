<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    
    <!-- Network status notifications -->
    <v-snackbar
      v-model="showOfflineWarning"
      :timeout="-1"
      color="error"
      location="top"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-wifi-off</v-icon>
        <span>{{ $t('common.offlineWarning') }}</span>
      </div>
    </v-snackbar>
    
    <v-snackbar
      v-model="showOnlineNotification"
      :timeout="5000"
      color="success"
      location="top"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-wifi</v-icon>
        <span>{{ $t('common.onlineNotification') }}</span>
      </div>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { watch, ref } from 'vue'

// Initialize i18n
const { t } = useI18n()

// Initialize auth store
const authStore = useAuthStore()

// Initialize network status
const { isOnline, wasOffline } = useNetworkStatus()
const showOfflineWarning = ref(false)
const showOnlineNotification = ref(false)

// Update network status notifications
watch(isOnline, (online) => {
  showOfflineWarning.value = !online
  if (online && wasOffline.value) {
    showOnlineNotification.value = true
  }
})

// Initialize auth on app load
onMounted(() => {
  authStore.init().catch(error => {
    console.error('Failed to initialize auth:', error)
  })
})
</script>

<style>
/* Global styles */
.v-application {
  font-family: 'Roboto', sans-serif;
}
</style>
