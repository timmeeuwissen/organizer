<template lang="pug">
div.collapsable-filter-panel(
  :class="isOpen ? 'collapsable-filter-panel--open' : 'collapsable-filter-panel--closed'"
  :style="isOpen ? 'flex-shrink:0;width:280px' : 'flex-shrink:0;width:40px;cursor:pointer'"
)
  //- Collapsed strip
  div.collapsable-filter-strip(
    v-if="!isOpen"
    style="width:40px;height:100%;display:flex;flex-direction:column;align-items:center;padding-top:8px;border-right:1px solid rgba(var(--v-border-color),var(--v-border-opacity))"
    @click="open"
  )
    v-btn(icon size="x-small" variant="text" @click.stop="open")
      v-icon mdi-chevron-right
    span.collapsable-filter-panel__rotated-title.text-caption.text-medium-emphasis {{ title }}

  //- Open panel
  div(v-else style="padding-right:12px")
    div.d-flex.align-center.mb-2
      span.text-subtitle-2 {{ title }}
      v-spacer
      v-btn(icon size="x-small" variant="text" @click="close")
        v-icon mdi-chevron-left

    slot
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

<style scoped>
.collapsable-filter-panel {
  transition: width 0.2s ease;
}

.collapsable-filter-panel__rotated-title {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  margin-top: 8px;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  max-height: 160px;
}
</style>
