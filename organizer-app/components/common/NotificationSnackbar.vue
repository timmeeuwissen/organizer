<template lang="pug">
.notification-container
  v-snackbar(
    v-if="active"
    :key="active.id"
    v-model="snackbarVisible"
    :color="snackbarColor"
    :timeout="active.timeout"
    location="bottom"
    :multi-line="multiLine"
    :vertical="vertical"
    @update:model-value="onVisibilityChange"
  )
    div.notification-content
      v-icon(v-if="showIcons" start) {{ getIconForType(active.type) }}
      span {{ active.message }}
    template(v-slot:actions v-if="active.dismissible")
      v-btn(variant="text" @click="closeCurrent") {{ $t('common.close') }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNotificationStore } from '~/stores/notification'

defineProps({
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

const notificationStore = useNotificationStore()

const active = computed(() => notificationStore.notifications[0] ?? null)

const snackbarVisible = ref(false)

watch(
  () => active.value?.id,
  (id) => {
    snackbarVisible.value = Boolean(id)
  },
  { immediate: true }
)

const snackbarColor = computed(() => {
  const t = active.value?.type
  if (t === 'success') { return 'success' }
  if (t === 'error') { return 'error' }
  if (t === 'warning') { return 'warning' }
  return 'info'
})

function getIconForType (type: string) {
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

function closeCurrent () {
  const id = active.value?.id
  if (id) {
    snackbarVisible.value = false
    notificationStore.dismiss(id)
  }
}

function onVisibilityChange (visible: boolean) {
  if (!visible && active.value) {
    notificationStore.dismiss(active.value.id)
  }
}
</script>

<style scoped lang="scss">
.notification-container {
  position: fixed;
  z-index: 2000;
}

.notification-content {
  display: flex;
  align-items: center;
}
</style>
