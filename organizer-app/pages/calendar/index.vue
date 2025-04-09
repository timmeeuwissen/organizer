<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('calendar.title') }}
      
  v-row
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title {{ $t('calendar.today') }}
        v-date-picker(
          v-model="selectedDate"
          elevation="0"
          width="100%"
        )
        
      v-card
        v-card-title {{ $t('common.filters') }}
        v-card-text
          v-switch(
            v-model="showMeetings"
            color="primary"
            :label="$t('meetings.title')"
            hide-details
          )
          v-switch(
            v-model="showTasks"
            color="info"
            :label="$t('tasks.title')"
            hide-details
          )
          v-switch(
            v-model="showCompletedTasks"
            color="success"
            :label="$t('tasks.completedTasks')"
            hide-details
          )
            
    v-col(cols="12" md="9")
      v-card
        v-card-title.d-flex
          v-btn-group(divided)
            v-btn(
              v-for="view in calendarViews"
              :key="view.value"
              :color="getViewButtonColor(view.value)"
              @click="currentView = view.value"
            ) {{ $t(view.title) }}
          v-spacer
          v-btn-group
            v-btn(icon @click="navigatePrevious")
              v-icon mdi-chevron-left
            v-btn(icon @click="navigateToday")
              v-icon mdi-calendar-today
            v-btn(icon @click="navigateNext")
              v-icon mdi-chevron-right
              
        v-card-text
          template(v-if="currentView === 'month'")
            .calendar-month
              .calendar-header
                .calendar-day-header(v-for="day in weekDays") {{ day }}
              .calendar-body
                .calendar-week(v-for="week in calendarDays")
                  .calendar-day(
                    v-for="day in week"
                    :class="getDayClasses(day)"
                    @click="selectDay(day.date)"
                  )
                    span.day-number {{ day.dayNumber }}
                    .calendar-events(v-if="day.events.length")
                      .calendar-event(
                        v-for="event in day.events.slice(0, 3)"
                        :key="event.id"
                        :class="getEventTypeClass(event)"
                      )
                        span {{ event.title }}
                      .calendar-event-more(v-if="day.events.length > 3")
                        span +{{ day.events.length - 3 }} more
                      
          template(v-else-if="currentView === 'week'")
            .calendar-week-view
              .calendar-week-header
                .calendar-week-time
                .calendar-week-days
                  .calendar-week-day(v-for="day in weekViewDays" :class="getWeekDayClasses(day)")
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
                  
          template(v-else-if="currentView === 'day'")
            .calendar-day-view
              .calendar-day-header
                h2 {{ formatSelectedDate() }}
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
                  
          template(v-else)
            .calendar-schedule
              v-list
                v-list-subheader {{ formatSelectedDate() }}
                template(v-if="selectedDateEvents.length === 0")
                  v-list-item
                    v-list-item-text {{ $t('calendar.noEvents') }}
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
        
        v-card-actions
          v-spacer
          v-btn(
            color="primary"
            :to="'/meetings/new'"
            v-if="showMeetings"
          ) {{ $t('meetings.title') }} +
          v-btn(
            color="info"
            :to="'/tasks/new'"
            v-if="showTasks"
          ) {{ $t('tasks.title') }} +
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTasksStore } from '~/stores/tasks'
// The meetings store would be imported here when implemented
// import { useMeetingsStore } from '~/stores/meetings'

// Stores
const tasksStore = useTasksStore()
// const meetingsStore = useMeetingsStore()

// State
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const currentView = ref('month')
const showMeetings = ref(true)
const showTasks = ref(true)
const showCompletedTasks = ref(false)
const events = ref([])
const loading = ref(true)

// Calendar navigation
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const hours = Array.from(Array(24).keys())
const calendarViews = [
  { title: 'calendar.month', value: 'month' },
  { title: 'calendar.week', value: 'week' },
  { title: 'calendar.day', value: 'day' },
  { title: 'calendar.schedule', value: 'schedule' }
]

// Load data
onMounted(async () => {
  try {
    await tasksStore.fetchTasks()
    // When meetings store is implemented:
    // await meetingsStore.fetchMeetings()
    
    // For now, we'll simulate some meetings
    simulateMeetings()
    
    // Combine tasks and meetings into events
    updateEvents()
  } catch (error) {
    console.error('Failed to load calendar data:', error)
  } finally {
    loading.value = false
  }
})

// Watch for filter changes
watch([showMeetings, showTasks, showCompletedTasks], () => {
  updateEvents()
})

// Helper to get first day of month
const getFirstDayOfMonth = (date) => {
  const d = new Date(date)
  d.setDate(1)
  return d
}

// Helper to get days in month
const getDaysInMonth = (date) => {
  const d = new Date(date)
  const month = d.getMonth()
  d.setMonth(month + 1)
  d.setDate(0)
  return d.getDate()
}

// Generate calendar days for month view
const calendarDays = computed(() => {
  const date = new Date(selectedDate.value)
  const firstDay = getFirstDayOfMonth(date)
  const daysInMonth = getDaysInMonth(date)
  const weeks = []
  
  // Get day of week of first day (0 = Sunday, 6 = Saturday)
  let dayOfWeek = firstDay.getDay()
  
  // Create first week with days from previous month if needed
  let week = []
  const prevMonth = new Date(date)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  const daysInPrevMonth = getDaysInMonth(prevMonth)
  
  for (let i = 0; i < dayOfWeek; i++) {
    const prevMonthDay = daysInPrevMonth - dayOfWeek + i + 1
    const dayDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthDay)
    
    week.push({
      date: dayDate,
      dayNumber: prevMonthDay,
      currentMonth: false,
      isToday: isToday(dayDate),
      isSelected: isSameDay(dayDate, new Date(selectedDate.value)),
      events: getEventsForDay(dayDate),
      hasEvents: getEventsForDay(dayDate).length > 0
    })
  }
  
  // Add days for current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(date.getFullYear(), date.getMonth(), day)
    
    week.push({
      date: dayDate,
      dayNumber: day,
      currentMonth: true,
      isToday: isToday(dayDate),
      isSelected: isSameDay(dayDate, new Date(selectedDate.value)),
      events: getEventsForDay(dayDate),
      hasEvents: getEventsForDay(dayDate).length > 0
    })
    
    dayOfWeek++
    
    // Start a new week
    if (dayOfWeek === 7 || day === daysInMonth) {
      weeks.push(week)
      week = []
      dayOfWeek = 0
    }
  }
  
  // Add days for next month if last week is not complete
  if (week.length > 0 && week.length < 7) {
    const nextMonth = new Date(date)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    for (let i = week.length; i < 7; i++) {
      const nextMonthDay = i - week.length + 1
      const dayDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonthDay)
      
      week.push({
        date: dayDate,
        dayNumber: nextMonthDay,
        currentMonth: false,
        isToday: isToday(dayDate),
        isSelected: isSameDay(dayDate, new Date(selectedDate.value)),
        events: getEventsForDay(dayDate),
        hasEvents: getEventsForDay(dayDate).length > 0
      })
    }
    
    weeks.push(week)
  }
  
  // If we have less than 6 weeks, add another week
  if (weeks.length < 6) {
    const nextMonth = new Date(date)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    week = []
    
    // Check if the last week and its last day exist and have a dayNumber
    const lastWeek = weeks[weeks.length - 1];
    const lastDayOfLastWeek = lastWeek && lastWeek[6];
    const lastDayNumber = lastDayOfLastWeek && lastDayOfLastWeek.dayNumber;
    
    // If we can't get the last day's number, use the first day of next month as fallback
    const startDayNumber = lastDayNumber !== undefined ? lastDayNumber + 1 : 1;
    
    for (let i = 0; i < 7; i++) {
      const nextMonthDay = startDayNumber + i;
      const dayDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonthDay)
      
      week.push({
        date: dayDate,
        dayNumber: nextMonthDay,
        currentMonth: false,
        isToday: isToday(dayDate),
        isSelected: isSameDay(dayDate, new Date(selectedDate.value)),
        events: getEventsForDay(dayDate),
        hasEvents: getEventsForDay(dayDate).length > 0
      })
    }
    
    weeks.push(week)
  }
  
  return weeks
})

// Generate days for week view
const weekViewDays = computed(() => {
  const date = new Date(selectedDate.value)
  const day = date.getDay()
  const diff = date.getDate() - day
  const firstDayOfWeek = new Date(date)
  firstDayOfWeek.setDate(diff)
  
  const days = []
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(firstDayOfWeek)
    dayDate.setDate(firstDayOfWeek.getDate() + i)
    
    days.push({
      date: dayDate,
      dayName: weekDays[i],
      dayNumber: dayDate.getDate(),
      isToday: isToday(dayDate),
      events: getEventsForDay(dayDate)
    })
  }
  
  return days
})

// Get events for selected date
const selectedDateEvents = computed(() => {
  return getEventsForDay(new Date(selectedDate.value)).sort((a, b) => {
    if (!a.startTime) return -1
    if (!b.startTime) return 1
    return a.startTime.getTime() - b.startTime.getTime()
  })
})

// Helper functions
const isToday = (date) => {
  const today = new Date()
  return isSameDay(date, today)
}

// Style and class calculations
const getDayClasses = (day) => {
  if (!day) return {}
  
  return {
    'current-month': day.currentMonth,
    'today': day.isToday,
    'selected': day.isSelected,
    'has-events': day.hasEvents
  }
}

const getWeekDayClasses = (day) => {
  if (!day) return {}
  
  return {
    'today': day.isToday
  }
}

const getViewButtonColor = (viewValue) => {
  return currentView.value === viewValue ? 'primary' : ''
}

const getEventStyle = (event) => {
  if (!event || typeof event.durationHours === 'undefined' || typeof event.minutesFromHourStart === 'undefined') {
    return {
      height: '0px',
      top: '0px'
    }
  }
  
  return {
    height: `${event.durationHours * 60}px`,
    top: `${event.minutesFromHourStart}px`
  }
}

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
}

const formatSelectedDate = () => {
  const date = new Date(selectedDate.value)
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const formatEventTime = (event) => {
  if (!event || !event.startTime) return ''
  
  let timeStr = event.startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  
  if (event.endTime) {
    timeStr += ' - ' + event.endTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  
  return timeStr
}

const getEventTypeClass = (event) => {
  if (!event || !event.type) return ''
  return event.type
}

const getEventClass = (event) => {
  if (!event || !event.type) return ''
  return `event-${event.type}`
}

const getEventIcon = (type) => {
  if (!type) return 'mdi-calendar'
  
  switch (type) {
    case 'meeting': return 'mdi-account-group'
    case 'task': return 'mdi-checkbox-marked-outline'
    default: return 'mdi-calendar'
  }
}

const getEventLink = (event) => {
  if (!event || !event.type || !event.id) return '#'
  
  if (event.type === 'meeting') {
    return `/meetings/${event.id}`
  } else if (event.type === 'task') {
    return `/tasks?id=${event.id}`
  }
  
  return '#'
}

// Navigation
const navigatePrevious = () => {
  const date = new Date(selectedDate.value)
  
  if (currentView.value === 'month') {
    date.setMonth(date.getMonth() - 1)
  } else if (currentView.value === 'week') {
    date.setDate(date.getDate() - 7)
  } else {
    date.setDate(date.getDate() - 1)
  }
  
  selectedDate.value = date.toISOString().slice(0, 10)
}

const navigateNext = () => {
  const date = new Date(selectedDate.value)
  
  if (currentView.value === 'month') {
    date.setMonth(date.getMonth() + 1)
  } else if (currentView.value === 'week') {
    date.setDate(date.getDate() + 7)
  } else {
    date.setDate(date.getDate() + 1)
  }
  
  selectedDate.value = date.toISOString().slice(0, 10)
}

const navigateToday = () => {
  selectedDate.value = new Date().toISOString().slice(0, 10)
}

const selectDay = (date) => {
  selectedDate.value = date.toISOString().slice(0, 10)
  
  if (currentView.value === 'month') {
    currentView.value = 'day'
  }
}

// Event handling
const updateEvents = () => {
  events.value = []
  
  // Add tasks as events
  if (showTasks.value) {
    tasksStore.tasks.forEach(task => {
      if (!showCompletedTasks.value && task.status === 'completed') {
        return
      }
      
      if (task.dueDate) {
        events.value.push({
          id: task.id,
          title: task.title,
          type: 'task',
          date: new Date(task.dueDate),
          allDay: true
        })
      }
    })
  }
  
  // Add meetings as events
  if (showMeetings.value) {
    // When meetings store is implemented, we'll use that
    // meetingsStore.meetings.forEach(meeting => {
    //   events.value.push({
    //     id: meeting.id,
    //     title: meeting.title,
    //     type: 'meeting',
    //     date: new Date(meeting.startTime),
    //     startTime: new Date(meeting.startTime),
    //     endTime: new Date(meeting.endTime),
    //     allDay: false
    //   })
    // })
    
    // For now, we'll use simulated meetings
    events.value = [...events.value, ...simulatedMeetings.value]
  }
}

const getEventsForDay = (date) => {
  if (!date || !events.value) return []
  
  return events.value.filter(event => {
    if (!event || !event.date) return false
    try {
      const eventDate = new Date(event.date)
      return isSameDay(eventDate, date)
    } catch (e) {
      return false
    }
  })
}

const getEventsForHour = (date, hour) => {
  if (!date || hour === undefined || !events.value) return []
  
  return events.value.filter(event => {
    if (!event || !event.date || !event.startTime) return false
    
    try {
      const eventDate = new Date(event.date)
      return isSameDay(eventDate, date) && event.startTime.getHours() === hour
    } catch (e) {
      return false
    }
  }).map(event => {
    // Calculate position and size in the hour slot
    const startTime = event.startTime
    const endTime = event.endTime || new Date(startTime.getTime() + 30 * 60 * 1000)
    
    const minutesFromHourStart = startTime.getMinutes()
    const durationHours = (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000)
    
    return {
      ...event,
      minutesFromHourStart,
      durationHours
    }
  })
}

// Simulated meetings for development
const simulatedMeetings = ref([])

const simulateMeetings = () => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  
  // Meeting in the past
  simulatedMeetings.value.push({
    id: 'meeting-1',
    title: 'Team Standup',
    type: 'meeting',
    date: yesterday,
    startTime: new Date(yesterday.setHours(9, 0)),
    endTime: new Date(yesterday.setHours(9, 30)),
    allDay: false
  })
  
  // Meeting today
  simulatedMeetings.value.push({
    id: 'meeting-2',
    title: 'Project Planning',
    type: 'meeting',
    date: today,
    startTime: new Date(new Date().setHours(14, 0)),
    endTime: new Date(new Date().setHours(15, 0)),
    allDay: false
  })
  
  // Meeting in the future
  simulatedMeetings.value.push({
    id: 'meeting-3',
    title: 'Client Demo',
    type: 'meeting',
    date: tomorrow,
    startTime: new Date(tomorrow.setHours(11, 0)),
    endTime: new Date(tomorrow.setHours(12, 0)),
    allDay: false
  })
}
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

.calendar-week-view, .calendar-day-view {
  display: flex;
  flex-direction: column;
  height: 600px;
  
  .calendar-week-header, .calendar-day-header {
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
  
  .calendar-week-body, .calendar-day-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    
    .calendar-week-row, .calendar-day-row {
      display: flex;
      height: 60px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      
      &:last-child {
        border-bottom: none;
      }
      
      .calendar-week-time, .calendar-day-time {
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
}

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
