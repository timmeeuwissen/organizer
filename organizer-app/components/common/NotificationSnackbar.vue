<template lang="pug">
div.notification-container
  v-snackbar(
    v-for="notification in notifications"
    :key="notification.id"
    v-model="notification.visible"
    :color="notification.type"
    :timeout="notification.timeout"
    :location="location"
    :multi-line="multiLine"
    :vertical="vertical"
  )
    div.notification-content
      v-icon(v-if="showIcons" start) {{ getIconForType(notification.type) }}
      span {{ notification.message }}
    template(v-slot:actions v-if="notification.dismissible")
      v-btn(variant="text" @click="dismiss(notification.id)") {{ $t('common.close') }}
</template>

<script setup>
import { computed, watch } from 'vue'
import { useNotificationStore } from '~/stores/notification.ts'

// Props
const props = defineProps({
  location: {
    type: String,
    default: 'top'
  },
  multiLine: {
    type: Boolean,
    default: false
  },
  vertical: {
    type: Boolean,
    default: false
  },
  showIcons: {
    type: Boolean,
    default: true
  }
})

// Notification store
const notificationStore = useNotificationStore()

// Make a reactive copy of notifications with an added 'visible' property
const notifications = computed(() => 
  notificationStore.notifications.map(notification => ({
    ...notification,
    visible: true
  }))
)

// Helper function to get icon for notification type
function getIconForType(type) {
  switch (type) {
    case 'success':
      return 'mdi-check-circle'
    case 'info':
      return 'mdi-information'
    case 'warning':
      return 'mdi-alert'
    case 'error':
      return 'mdi-alert-circle'
    default:
      return 'mdi-bell'
  }
}

// Dismiss a notification
function dismiss(id) {
  notificationStore.dismiss(id)
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  z-index: 2000;
}

.notification-content {
  display: flex;
  align-items: center;
}
</style>
