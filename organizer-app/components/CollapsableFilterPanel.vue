<template lang="pug">
//- Open panel — matches NetworkSidebar style exactly
div.collapsable-filter-panel(v-if="isOpen")
  v-list(density="compact")
    v-list-item
      template(#title)
        span.text-subtitle-2 {{ title }}
      template(#append)
        v-btn(icon size="x-small" variant="text" @click="close")
          v-icon mdi-chevron-left
  div.collapsable-filter-panel__content
    slot

//- Closed strip — matches network/index.vue closed strip
.d-flex.flex-column.align-center.pt-2.collapsable-filter-strip(
  v-else
  @click="open"
)
  v-btn(icon size="x-small" variant="text" @click.stop="open")
    v-icon mdi-chevron-right
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  storageKey: {
    type: String,
    required: true
  }
})

const isOpen = ref(true)

onMounted(() => {
  const saved = localStorage.getItem(`filterPanel:${props.storageKey}`)
  if (saved !== null) {
    isOpen.value = saved !== 'false'
  }
})

const open = () => {
  isOpen.value = true
  localStorage.setItem(`filterPanel:${props.storageKey}`, 'true')
}

const close = () => {
  isOpen.value = false
  localStorage.setItem(`filterPanel:${props.storageKey}`, 'false')
}
</script>

<style lang="sass" scoped>
.collapsable-filter-panel
  width: 280px
  flex-shrink: 0
  background: rgb(var(--v-theme-surface))
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))

.collapsable-filter-panel__content
  padding: 0 12px 12px

.collapsable-filter-strip
  width: 32px
  flex-shrink: 0
  background: rgb(var(--v-theme-surface))
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))
  cursor: pointer
</style>
