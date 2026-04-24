<template lang="pug">
CollapsibleCard(:title="title")
  template(v-if="hasFilters" #header-actions)
    v-btn(
      icon
      variant="text"
      size="small"
      color="error"
      @click="$emit('clear-filters')"
    )
      v-icon mdi-filter-remove
  slot
</template>

<script setup lang="ts">
import CollapsibleCard from '~/components/common/CollapsibleCard.vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  hasFilters: {
    type: Boolean,
    default: false
  }
})

defineEmits(['clear-filters'])
</script>
