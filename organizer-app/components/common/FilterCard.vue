<template lang="pug">
v-card(class="mb-4")
  v-card-title.d-flex
    span {{ title }}
    v-spacer
    v-btn(
      v-if="hasFilters"
      icon
      variant="text"
      size="small"
      @click="$emit('clear-filters')"
      color="error"
    )
      v-icon mdi-filter-remove

  v-card-text
    slot
</template>

<script setup lang="ts">
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
