<template lang="pug">
.calendar-schedule
  v-list
    v-list-subheader {{ formatSelectedDate(selectedDate) }}
    template(v-if="selectedDateEvents.length === 0")
      v-list-item
        v-list-item-title {{ $t('calendar.noEvents') }}
    template(v-else)
      v-list-item(
        v-for="event in selectedDateEvents"
        :key="event.id"
        :class="getEventClass(event)"
      )
        template(v-slot:prepend)
          v-icon(:icon="getEventIcon(event.type)")
        v-list-item-title {{ event.title }}
        v-list-item-subtitle
          template(v-if="event.startTime") {{ formatEventTime(event) }}
          template(v-else) {{ $t('calendar.allDay') }}
        template(v-slot:append)
          v-btn(
            icon
            variant="text"
            :to="getEventLink(event)"
            color="primary"
          )
            v-icon mdi-open-in-new
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue';

const props = defineProps({
  selectedDate: {
    type: Date,
    required: true
  },
  events: {
    type: Array,
    required: true
  }
});

// Get events for selected date
const selectedDateEvents = computed(() => {
  if (!props.selectedDate || !props.events) return [];
  
  return props.events
    .filter(event => {
      if (!event || !event.date) return false;
      try {
        const eventDate = new Date(event.date);
        return isSameDay(eventDate, props.selectedDate);
      } catch (e) {
        return false;
      }
    })
    .sort((a, b) => {
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return a.startTime.getTime() - b.startTime.getTime();
    });
});

// Helper functions
const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

const formatSelectedDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatEventTime = (event) => {
  if (!event || !event.startTime) return '';
  
  let timeStr = event.startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  
  if (event.endTime) {
    timeStr += ' - ' + event.endTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  
  return timeStr;
};

const getEventClass = (event) => {
  if (!event || !event.type) return '';
  return `event-${event.type}`;
};

const getEventIcon = (type) => {
  if (!type) return 'mdi-calendar';
  
  switch (type) {
    case 'meeting': return 'mdi-account-group';
    case 'task': return 'mdi-checkbox-marked-outline';
    default: return 'mdi-calendar';
  }
};

const getEventLink = (event) => {
  if (!event || !event.type || !event.id) return '#';
  
  if (event.type === 'meeting') {
    return `/meetings/${event.id}`;
  } else if (event.type === 'task') {
    return `/tasks?id=${event.id}`;
  }
  
  return '#';
};
</script>

<style lang="scss" scoped>
.calendar-schedule {
  max-height: 600px;
  overflow-y: auto;
  
  .event-task {
    background-color: rgba(25, 118, 210, 0.05);
  }
  
  .event-meeting {
    background-color: rgba(76, 175, 80, 0.05);
  }
}
</style>
