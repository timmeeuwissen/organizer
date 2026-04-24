<template lang="pug">
v-card
  v-card-title.d-flex.align-center
    v-btn(
      icon
      variant="text"
      size="small"
      :aria-expanded="String(isOpen)"
      :aria-label="isOpen ? $t('common.collapse') : $t('common.expand')"
      @click="toggle"
    )
      v-icon {{ isOpen ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
    span.flex-grow-1 {{ title }}
    slot(name="header-actions")
    v-btn(
      v-if="helpText"
      icon
      variant="text"
      size="small"
      :color="isHelpOpen ? 'amber-darken-2' : undefined"
      :aria-expanded="String(isHelpOpen)"
      :aria-label="isHelpOpen ? $t('common.hideHelp') : $t('common.showHelp')"
      @click="toggleHelp"
    )
      v-icon {{ isHelpOpen ? 'mdi-help-circle' : 'mdi-help-circle-outline' }}
  v-expand-transition
    v-alert(v-if="helpText" v-show="isHelpOpen" color="amber" variant="tonal" icon="mdi-help-circle" rounded="0" class="ma-4")
      | {{ helpText }}
  v-expand-transition
    v-card-text(v-show="isOpen")
      slot
</template>

<script setup lang="ts">
import { useCollapsible } from '~/composables/useCollapsible'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  storageKey: {
    type: String,
    default: undefined
  },
  defaultOpen: {
    type: Boolean,
    default: true
  },
  helpText: {
    type: String,
    default: undefined
  }
})

const { isOpen, toggle } = useCollapsible({
  storageKey: props.storageKey,
  defaultOpen: props.defaultOpen
})

const { isOpen: isHelpOpen, toggle: toggleHelp } = useCollapsible({ defaultOpen: false })
</script>
