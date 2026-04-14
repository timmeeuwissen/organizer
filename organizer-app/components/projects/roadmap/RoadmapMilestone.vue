<template lang="pug">
v-tooltip(:text="tooltipText" location="top")
  template(v-slot:activator="{ props }")
    span.roadmap-milestone(
      v-bind="props"
      :style="{ left: `${leftPx}px`, color: `rgb(var(--v-theme-${color}))` }"
      @dblclick.stop="$emit('edit')"
    ) ◆
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  description?: string
  leftPx: number
  color: string
}>()

defineEmits<{ edit: [] }>()

const tooltipText = computed(() =>
  props.description ? `${props.title}: ${props.description}` : props.title
)
</script>

<style lang="sass">
.roadmap-milestone
  position: absolute
  top: 50%
  transform: translate(-50%, -50%)
  font-size: 18px
  cursor: pointer
  user-select: none
  z-index: 2
  &:hover
    filter: brightness(1.3)
</style>
