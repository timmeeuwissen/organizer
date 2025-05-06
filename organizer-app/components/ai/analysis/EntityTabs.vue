<template lang="pug">
div
  // Tabs for different entity types
  v-tabs(:modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" color="primary")
    v-tab(
      v-for="tab in tabs" 
      :key="tab.value" 
      :value="tab.value"
      :class="{ 'error-tab': hasTabErrors(tab.value) }"
    ) 
      v-icon(start) {{ tab.icon }}
      | {{ tab.label }} ({{ tab.count }})
      v-icon(
        v-if="hasTabErrors(tab.value)"
        size="small"
        color="error"
        class="ml-1"
      ) mdi-alert-circle
  
  v-window(:modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)")
    v-window-item(
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
    )
      slot(:name="tab.value")
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'people'
  },
  tabs: {
    type: Array,
    required: true
    // Expected format: [{value: 'people', label: 'People', icon: 'mdi-account', count: 5}, ...]
  },
  invalidItems: {
    type: Object,
    default: () => ({})
    // Format: { people: ['id1', 'id2'], projects: ['id3'] }
  }
});

const emit = defineEmits(['update:modelValue']);

// Direct binding now used with :modelValue and @update:modelValue

function hasTabErrors(tabValue) {
  return props.invalidItems[tabValue] && props.invalidItems[tabValue].length > 0;
}
</script>

<style scoped>
.error-tab ::v-deep(.v-tab__content) {
  color: rgb(var(--v-theme-error)) !important;
}
</style>
