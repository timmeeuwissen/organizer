<template lang="pug">
.calendar-month
  .calendar-header
    .calendar-day-header(v-for="day in weekDays") {{ day }}
  .calendar-body
    .calendar-week(v-for="(week, weekIndex) in calendarDays")
      .calendar-week-number(@click="$emit('week-click', week[0].date)")
        span {{ getWeekNumber(week[0].date) }}
      .calendar-day(
        v-for="day in week"
        :class="getDayClasses(day)"
        @click="$emit('day-click', day.date)"
      )
        span.day-number {{ day.dayNumber }}
        .calendar-event-indicators(v-if="day.events.length")
          .calendar-event-dot(
            v-for="(color, calendarId) in getEventCalendarColors(day.events)"
            :key="calendarId"
            :style="{ backgroundColor: color }"
          )
        .calendar-events(v-if="day.events.length")
          .calendar-event(
            v-for="event in day.events.slice(0, 3)"
            :key="event.id"
            :class="getEventTypeClass(event)"
            :style="getEventColorStyle(event)"
          )
            span {{ event.title }}
          .calendar-event-more(v-if="day.events.length > 3")
            span +{{ day.events.length - 3 }} more
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { useCalendarStore } from '~/stores/calendar';
import { useCalendarHelpers } from '~/composables/useCalendarHelpers';

const props = defineProps({
  calendarDays: {
    type: Array,
    required: true
  },
  weekDays: {
    type: Array,
    required: true
  },
  calendars: {
    type: Array,
    required: true
  }
});

defineEmits(['day-click', 'week-click']);

// Access calendar store to get color information
const calendarStore = useCalendarStore();

// Use calendar helpers for week number calculation
const { getWeekNumber } = useCalendarHelpers();

// Style and class calculations
const getDayClasses = (day) => {
  if (!day) return {};
  
  return {
    'current-month': day.currentMonth,
    'today': day.isToday,
    'selected': day.isSelected,
    'has-events': day.hasEvents
  };
};

const getEventTypeClass = (event) => {
  if (!event || !event.type) return '';
  return event.type;
};

const getEventColorStyle = (event) => {
  // If event has a calendarId and it matches a known calendar
  if (event.calendarId) {
    const calendar = props.calendars.find(cal => cal.id === event.calendarId);
    if (calendar && calendar.color) {
      return {
        backgroundColor: `${calendar.color}20`, // 20 is hex for 12.5% opacity
        color: calendar.color,
        borderLeft: `3px solid ${calendar.color}`
      };
    }
  }
  
  // Default styling by type
  if (event.type === 'task') {
    return {
      backgroundColor: 'rgba(25, 118, 210, 0.1)',
      color: '#1976d2',
      borderLeft: '3px solid #1976d2'
    };
  } else if (event.type === 'meeting') {
    return {
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      color: '#4caf50',
      borderLeft: '3px solid #4caf50'
    };
  }
  
  return {};
};

// Get a map of calendarId -> color for a day's events
const getEventCalendarColors = (events) => {
  const colorMap = {};
  
  events.forEach(event => {
    if (event.calendarId) {
      const calendar = props.calendars.find(cal => cal.id === event.calendarId);
      if (calendar && calendar.color && !colorMap[calendar.id]) {
        colorMap[calendar.id] = calendar.color;
      }
    } else if (event.type && !colorMap[event.type]) {
      // Default colors by type if no calendar color
      if (event.type === 'task') {
        colorMap[event.type] = '#1976d2'; // blue
      } else if (event.type === 'meeting') {
        colorMap[event.type] = '#4caf50'; // green
      }
    }
  });
  
  return colorMap;
};

// Using getWeekNumber from useCalendarHelpers
</script>

<style lang="scss" scoped>
.calendar-month {
  display: flex;
  flex-direction: column;
  width: 100%;
  
  .calendar-header {
    display: flex;
    padding: 8px 0;
    font-weight: bold;
    
    .calendar-day-header {
      flex: 1;
      text-align: center;
    }
  }
  
  .calendar-body {
    display: flex;
    flex-direction: column;
    
    .calendar-week {
      display: flex;
      min-height: 120px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      
      &:last-child {
        border-bottom: none;
      }
      
      .calendar-week-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        font-size: 0.8rem;
        color: rgba(0, 0, 0, 0.6);
        background-color: rgba(0, 0, 0, 0.04);
        cursor: pointer;
        border-right: 1px solid rgba(0, 0, 0, 0.12);
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.08);
          font-weight: bold;
        }
      }
      
      .calendar-day {
        flex: 1;
        padding: 8px;
        border-right: 1px solid rgba(0, 0, 0, 0.12);
        cursor: pointer;
        position: relative;
        overflow: hidden;
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
        
        &:last-child {
          border-right: none;
        }
        
        &.current-month {
          background-color: white;
        }
        
        &:not(.current-month) {
          background-color: rgba(0, 0, 0, 0.04);
          color: rgba(0, 0, 0, 0.38);
        }
        
        &.today {
          background-color: rgba(25, 118, 210, 0.05);
          
          .day-number {
            color: white;
            background-color: var(--v-primary-base);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
          }
        }
        
        &.selected {
          background-color: rgba(25, 118, 210, 0.1);
        }
        
        &.has-events {
          .day-number {
            font-weight: bold;
          }
        }
        
        .day-number {
          margin-bottom: 4px;
        }
        
        .calendar-event-indicators {
          display: flex;
          gap: 3px;
          margin-bottom: 4px;
          
          .calendar-event-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
        }
        
        .calendar-events {
          display: flex;
          flex-direction: column;
          gap: 2px;
          
          .calendar-event {
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 0.75rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            
            &.task {
              background-color: rgba(25, 118, 210, 0.1);
              color: #1976d2;
            }
            
            &.meeting {
              background-color: rgba(76, 175, 80, 0.1);
              color: #4caf50;
            }
          }
          
          .calendar-event-more {
            font-size: 0.75rem;
            color: rgba(0, 0, 0, 0.6);
            text-align: right;
          }
        }
      }
    }
  }
}
</style>
