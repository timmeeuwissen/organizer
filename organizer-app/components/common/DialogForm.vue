<template lang="pug">
v-dialog(
  :model-value="modelValue"
  @update:model-value="$emit('update:modelValue', $event)"
  :max-width="maxWidth"
)
  slot
</template>

<script setup lang="ts">
defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  maxWidth: {
    type: String,
    default: '600px'
  }
})

defineEmits(['update:modelValue'])
</script>
