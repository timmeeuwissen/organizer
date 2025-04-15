<template lang="pug">
.calendar-week-view
  .calendar-week-header
    .calendar-week-time
    .calendar-week-days
      .calendar-week-day(
        v-for="day in weekViewDays" 
        :class="getWeekDayClasses(day)"
        @click="$emit('day-header-click', day.date)"
      )
        .day-name {{ day.dayName }}
        .day-number {{ day.dayNumber }}
  .calendar-week-body
    .calendar-week-row(v-for="hour in hours")
      .calendar-week-time {{ hour }}:00
      .calendar-week-slots
        .calendar-week-slot(
          v-for="day in weekViewDays"
          :class="getWeekDayClasses(day)"
        )
          .calendar-event(
            v-for="event in getEventsForHour(day.date, hour)"
            :key="event.id"
            :class="getEventTypeClass(event)"
            :style="getEventStyle(event)"
          )
            span {{ event.title }}
  
  // Current time indicator
  .current-time-indicator(
    v-if="showCurrentTimeIndicator"
    :style="currentTimeStyle"
  )
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useCalendarHelpers } from '~/composables/useCalendarHelpers';

const props = defineProps({
  weekViewDays: {
    type: Array,
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
    required: true
  }
});

// Use calendar helpers
const { isSameDay, isToday } = useCalendarHelpers();

defineEmits(['day-header-click']);

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

// Check if current time should be shown (if today is in the week view)
const showCurrentTimeIndicator = computed(() => {
  return props.weekViewDays.some(day => isToday(day.date));
});

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

// Style and class calculations
const getWeekDayClasses = (day) => {
  if (!day) return {};
  
  return {
    'today': isToday(day.date)
  };
};

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

// Using helpers from useCalendarHelpers instead of local implementations
</script>

<style lang="scss" scoped>
.calendar-week-view {
  display: flex;
  flex-direction: column;
  height: 600px;
  position: relative; // For positioning the current time indicator
  
  .calendar-week-header {
    display: flex;
    padding: 8px 0;
    font-weight: bold;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    
    .calendar-week-time {
      width: 60px;
    }
    
    .calendar-week-days {
      display: flex;
      flex: 1;
      
      .calendar-week-day {
        flex: 1;
        text-align: center;
        padding: 4px;
        cursor: pointer;
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
        
        &.today {
          background-color: rgba(25, 118, 210, 0.05);
        }
        
        .day-name {
          font-weight: bold;
        }
        
        .day-number {
          font-size: 1.2rem;
        }
      }
    }
  }
  
  .calendar-week-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    
    .calendar-week-row {
      display: flex;
      height: 60px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      
      &:last-child {
        border-bottom: none;
      }
      
      .calendar-week-time {
        width: 60px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 4px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 0.75rem;
      }
      
      .calendar-week-slots {
        display: flex;
        flex: 1;
        
        .calendar-week-slot {
          flex: 1;
          border-right: 1px solid rgba(0, 0, 0, 0.12);
          position: relative;
          
          &:last-child {
            border-right: none;
          }
          
          &.today {
            background-color: rgba(25, 118, 210, 0.05);
          }
        }
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
