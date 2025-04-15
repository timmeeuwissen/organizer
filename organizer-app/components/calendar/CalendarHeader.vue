<template lang="pug">
.calendar-header-wrapper
  v-btn-group(divided)
    v-btn(
      v-for="view in calendarViews"
      :key="view.value"
      :color="getViewButtonColor(view.value)"
      @click="$emit('update:view', view.value)"
    ) {{ $t(view.title) }}
  v-spacer
  v-btn-group
    v-btn(icon @click="$emit('navigate', 'previous')")
      v-icon mdi-chevron-left
    v-btn(icon @click="$emit('navigate', 'today')")
      v-icon mdi-calendar-today
    v-btn(icon @click="$emit('navigate', 'next')")
      v-icon mdi-chevron-right
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

defineEmits(['update:view', 'navigate']);

const props = defineProps({
  currentView: {
    type: String,
    required: true
  }
});

// Calendar view options
const calendarViews = [
  { title: 'calendar.month', value: 'month' },
  { title: 'calendar.week', value: 'week' },
  { title: 'calendar.day', value: 'day' },
  { title: 'calendar.schedule', value: 'schedule' }
];

// Get button color based on selected view
const getViewButtonColor = (viewValue) => {
  return props.currentView === viewValue ? 'primary' : '';
};
</script>
