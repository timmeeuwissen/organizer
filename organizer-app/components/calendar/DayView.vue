<template lang="pug">
.calendar-day-view
  .calendar-day-header
    h2 {{ formatSelectedDate(selectedDate) }}
  .calendar-day-body
    .calendar-day-row(v-for="hour in hours")
      .calendar-day-time {{ hour }}:00
      .calendar-day-slot
        .calendar-event(
          v-for="event in getEventsForHour(selectedDate, hour)"
          :key="event.id"
          :class="getEventTypeClass(event)"
          :style="getEventStyle(event)"
        )
          span {{ event.title }}
  
  // Current time indicator (only shown if the selected date is today)
  .current-time-indicator(
    v-if="isToday(selectedDate)"
    :style="currentTimeStyle"
  )
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useCalendarHelpers } from '~/composables/useCalendarHelpers';

const props = defineProps({
  selectedDate: {
    type: Date,
    required: true
  },
  hours: {
    type: Array,
    required: true
  },
  getEventsForHour: {
    type: Function,
    required: true
  },
  calendars: {
    type: Array,
    default: () => []
  }
});

// Use calendar helpers
const { isSameDay, isToday, formatDate } = useCalendarHelpers();

// Current time indicator
const now = ref(new Date());
const timeIndicatorInterval = ref(null);

onMounted(() => {
  updateCurrentTime();
  // Update the current time every minute
  timeIndicatorInterval.value = setInterval(updateCurrentTime, 60000);
});

onBeforeUnmount(() => {
  if (timeIndicatorInterval.value) {
    clearInterval(timeIndicatorInterval.value);
  }
});

const updateCurrentTime = () => {
  now.value = new Date();
};

// Calculate the position for the current time indicator
const currentTimeStyle = computed(() => {
  const currentHour = now.value.getHours();
  const currentMinute = now.value.getMinutes();
  const minutePercentage = currentMinute / 60;
  
  // Calculate position from top (each hour is 60px high)
  const topPosition = (currentHour * 60) + (minutePercentage * 60);
  
  return {
    top: `${topPosition}px`
  };
});

// Use formatDate from helpers for consistent date formatting
const formatSelectedDate = (date) => {
  if (!date) return '';
  return formatDate(date);
};

// Style and class calculations
const getEventTypeClass = (event) => {
  if (!event || !event.type) return '';
  return event.type;
};

const getEventStyle = (event) => {
  if (!event || typeof event.durationHours === 'undefined' || 
      typeof event.minutesFromHourStart === 'undefined') {
    return {
      height: '0px',
      top: '0px'
    };
  }
  
  // If the event has a calendar color, use it
  let colorStyle = {};
  
  if (event.calendarId) {
    const calendar = props.calendars?.find(cal => cal.id === event.calendarId);
    if (calendar && calendar.color) {
      colorStyle = {
        backgroundColor: `${calendar.color}20`, // 20 is hex for 12.5% opacity
        color: calendar.color,
        borderLeft: `3px solid ${calendar.color}`
      };
    }
  }
  
  return {
    height: `${event.durationHours * 60}px`,
    top: `${event.minutesFromHourStart}px`,
    ...colorStyle
  };
};

// No need for these helper functions as we're now using the ones from useCalendarHelpers
</script>

<style lang="scss" scoped>
.calendar-day-view {
  display: flex;
  flex-direction: column;
  height: 600px;
  position: relative; // For positioning the current time indicator
  
  .calendar-day-header {
    display: flex;
    padding: 8px 0;
    font-weight: bold;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    
    h2 {
      margin: 0;
      padding: 8px 0;
    }
  }
  
  .calendar-day-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    
    .calendar-day-row {
      display: flex;
      height: 60px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      
      &:last-child {
        border-bottom: none;
      }
      
      .calendar-day-time {
        width: 60px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 4px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 0.75rem;
      }
      
      .calendar-day-slot {
        flex: 1;
        position: relative;
      }
      
      .calendar-event {
        position: absolute;
        left: 0;
        right: 0;
        margin: 1px 2px;
        padding: 2px 4px;
        border-radius: 2px;
        font-size: 0.75rem;
        overflow: hidden;
        z-index: 1;
        
        &.task {
          background-color: rgba(25, 118, 210, 0.1);
          color: #1976d2;
        }
        
        &.meeting {
          background-color: rgba(76, 175, 80, 0.1);
          color: #4caf50;
        }
      }
    }
  }
  
  // Current time indicator
  .current-time-indicator {
    position: absolute;
    left: 60px; // Start after the time column
    right: 0;
    height: 2px;
    background-color: #f44336; // Red color
    z-index: 2;
    
    &::before {
      content: '';
      position: absolute;
      left: -5px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #f44336;
    }
  }
}
</style>
