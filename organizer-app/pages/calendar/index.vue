<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('calendar.title') }}

  template(v-if="!hasCalendarIntegrations")
    v-row(justify="center" align="center" class="mt-4")
      v-col(cols="12" md="8")
        v-card
          v-card-text(class="text-center pa-6")
            v-icon(size="x-large" color="primary" class="mb-4") mdi-calendar-blank-off
            h3.text-h5.mb-4 {{ $t('calendar.noCalendarIntegrations') }}
            p.text-body-1.mb-4 {{ $t('calendar.connectCalendarIntegration') }}
            v-btn(
              color="primary"
              :to="'/auth/profile'"
              prepend-icon="mdi-account-cog"
            ) {{ $t('calendar.goToProfile') }}

  v-row(v-else)
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title {{ $t('calendar.today') }}
        v-date-picker(
          v-model="selectedDate"
          elevation="0"
          width="100%"
        )

      ModuleIntegrationAccountFilter(
        module-segment="calendar"
        v-model="selectedProviders"
        class="mb-4"
      )

      FilterContainer(
        :title="$t('common.filters')"
        :switchFilters="switchFilters"
        @filter-change="handleFilterChange"
        @clear-filters="clearFilters"
      )

    v-col(cols="12" md="9")
      v-card
        v-card-title.d-flex
          CalendarHeader(
            :current-view="currentView"
            @update:view="currentView = $event"
            @navigate="handleNavigation"
          )

        v-card-text
          template(v-if="currentView === 'month'")
            MonthView(
              :calendar-days="calendarDays"
              :week-days="weekDays"
              :calendars="calendarStore.calendars"
              @day-click="selectDay"
              @week-click="selectWeek"
            )

          template(v-else-if="currentView === 'week'")
            WeekView(
              :week-view-days="weekViewDays"
              :hours="hours"
              :calendars="calendarStore.calendars"
              :get-events-for-hour="getEventsForHour"
              @day-header-click="selectDayFromWeekView"
            )

          template(v-else-if="currentView === 'day'")
            DayView(
              :selected-date="new Date(selectedDate)"
              :hours="hours"
              :calendars="calendarStore.calendars"
              :get-events-for-hour="getEventsForHour"
            )

          template(v-else)
            ScheduleView(
              :selected-date="new Date(selectedDate)"
              :events="selectedDateEvents"
            )

        v-card-actions
          v-spacer
          //- todo: new meetings should be made in a popup
          v-btn(
            color="primary"
            v-if="showMeetings"
          ) {{ $t('meetings.title') }} +
          //- todo: new tasks should be made in a popup
          v-btn(
            color="info"
            v-if="showTasks"
          ) {{ $t('tasks.title') }} +
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useTasksStore } from '~/stores/tasks'
import { useCalendarStore } from '~/stores/calendar'
import { useCalendarHelpers } from '~/composables/useCalendarHelpers'

// Import custom calendar components
import CalendarHeader from '~/components/calendar/CalendarHeader.vue'
import MonthView from '~/components/calendar/MonthView.vue'
import WeekView from '~/components/calendar/WeekView.vue'
import DayView from '~/components/calendar/DayView.vue'
import ScheduleView from '~/components/calendar/ScheduleView.vue'
import ModuleIntegrationAccountFilter from '~/components/integrations/ModuleIntegrationAccountFilter.vue'
import FilterContainer from '~/components/common/FilterContainer.vue'
import { useModuleIntegrationAccounts } from '~/composables/useModuleIntegrationAccounts'

// Stores
const tasksStore = useTasksStore()
const calendarStore = useCalendarStore()

// Helper composable
const {
  isSameDay,
  isToday,
  getFirstDayOfMonth,
  getDaysInMonth,
  getWeekNumber,
  getWeekStartDay,
  getWeekDayNames,
  getFirstDayOfWeek
} = useCalendarHelpers()

const { accounts: connectedAccounts } = useModuleIntegrationAccounts('calendar')

// Provider filters
const selectedProviders = ref<string[]>([])

// Initialize selectedProviders with all providers by default
onMounted(() => {
  // After the accounts are loaded, select all by default
  nextTick(() => {
    selectedProviders.value = connectedAccounts.value.map(account => account.id)
  })
})

// Watch for changes in selectedProviders
watch(selectedProviders, (newProviders) => {
  console.log('Calendar provider filter changed:', newProviders)
})

const hasCalendarIntegrations = computed(() => connectedAccounts.value.length > 0)

// State
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const currentView = ref('month')
const showMeetings = ref(true)
const showTasks = ref(true)
const showCompletedTasks = ref(false)
const loading = ref(true)

// Calendar navigation using user preferences
const weekDays = computed(() => getWeekDayNames('short'))
const hours = Array.from(Array(24).keys())

// Load data
onMounted(async () => {
  try {
    loading.value = true

    // Fetch tasks
    await tasksStore.fetchTasks()

    // Load calendar events from integrations
    if (hasCalendarIntegrations.value) {
      // Set date range for calendar query
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(1) // First day of current month

      const endDate = new Date(today)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0) // Last day of current month

      // Fetch events from calendar integrations
      await calendarStore.fetchEvents({
        startDate,
        endDate
      })

      // Fetch available calendars
      await calendarStore.fetchCalendars()
    }
  } catch (error) {
    console.error('Failed to load calendar data:', error)
  } finally {
    loading.value = false
  }
})

// Filter configuration for FilterContainer
const switchFilters = computed(() => [
  {
    title: 'Show Meetings',
    selected: showMeetings,
    color: 'primary'
  },
  {
    title: 'Show Tasks',
    selected: showTasks,
    color: 'info'
  },
  {
    title: 'Show Completed Tasks',
    selected: showCompletedTasks,
    color: 'success'
  }
])

// Handle filter changes
const handleFilterChange = (filters: any) => {
  console.log('[Calendar] Filter changed:', filters)
  // Update the switch values based on the filter container's state
  if (filters.switchFilters && filters.switchFilters.length === 3) {
    showMeetings.value = filters.switchFilters[0].selected
    showTasks.value = filters.switchFilters[1].selected
    showCompletedTasks.value = filters.switchFilters[2].selected
  }
}

// Clear all filters
const clearFilters = () => {
  showMeetings.value = true
  showTasks.value = true
  showCompletedTasks.value = false
  // Reset providers to select all
  selectedProviders.value = connectedAccounts.value.map(account => account.id)
}

// Watch for filter changes
watch([showMeetings, showTasks, showCompletedTasks], () => {
  console.log('[Calendar] Filter changed, recalculating events')
})

// Watch for month/date changes to load new event data
watch(selectedDate, (newDate) => {
  if (hasCalendarIntegrations.value) {
    const date = new Date(newDate)

    // When changing months, fetch events for the new month
    if (currentView.value === 'month') {
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      calendarStore.fetchEvents({
        startDate,
        endDate
      })
    }
    // For week view, fetch events for that week
    else if (currentView.value === 'week') {
      const day = date.getDay()
      const diff = date.getDate() - day
      const startDate = new Date(date)
      startDate.setDate(diff)

      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 7)

      calendarStore.fetchEvents({
        startDate,
        endDate
      })
    }
  }
})

// Get provider color based on the account ID
const getProviderColor = (accountId: string | undefined) => {
  if (!accountId) { return 'primary' }

  const account = connectedAccounts.value.find(acc => acc.id === accountId)
  if (!account) { return 'primary' }

  // Check if the account has a predefined color
  if (account.color) {
    return account.color
  }

  // Generate deterministic color based on account ID
  let hash = 0
  const id = account.id
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}

// Generate calendar days for month view
const calendarDays = computed(() => {
  const date = new Date(selectedDate.value)
  const firstDay = getFirstDayOfMonth(date)
  const daysInMonth = getDaysInMonth(date)
  const weeks = []

  // Get the user's preferred week start day (0 = Sunday, 1 = Monday, etc.)
  const weekStartDay = getWeekStartDay()

  // Calculate the day of week relative to the user's preferred start day
  // e.g., if week starts on Monday (1) and the first day is Wednesday (3), this would be 2
  let dayOfWeek = (firstDay.getDay() - weekStartDay + 7) % 7

  // Create first week with days from previous month if needed
  let week: any[] = []
  const prevMonth = new Date(date)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  const daysInPrevMonth = getDaysInMonth(prevMonth)

  for (let i = 0; i < dayOfWeek; i++) {
    const prevMonthDay: number = daysInPrevMonth - dayOfWeek + i + 1
    const dayDate: Date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthDay)

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
    if (dayOfWeek === 7) {
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

  return weeks
})

// Generate days for week view
const weekViewDays = computed(() => {
  const date = new Date(selectedDate.value)
  // Use the helper function to get the first day of the week based on user preference
  const firstDayOfWeek = getFirstDayOfWeek(date)

  const days = []
  const dayNamesArray = weekDays.value

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(firstDayOfWeek)
    dayDate.setDate(firstDayOfWeek.getDate() + i)

    days.push({
      date: dayDate,
      dayName: dayNamesArray[i],
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
    if (!a.startTime) { return -1 }
    if (!b.startTime) { return 1 }
    return a.startTime.getTime() - b.startTime.getTime()
  })
})

// Use computed for combined events to make it reactive to store changes
const combinedEvents = computed(() => {
  let result: any[] = []

  // Add tasks as events
  if (showTasks.value) {
    tasksStore.tasks.forEach((task) => {
      if (!showCompletedTasks.value && task.status === 'completed') {
        return
      }

      if (task.dueDate) {
        result.push({
          id: task.id,
          title: task.title,
          type: 'task',
          date: new Date(task.dueDate),
          startTime: new Date(task.dueDate),
          endTime: new Date(task.dueDate),
          allDay: true
        })
      }
    })
  }

  // Add calendar events from integrations
  if (hasCalendarIntegrations.value && showMeetings.value) {
    calendarStore.events.forEach((event) => {
      result.push({
        ...event,
        type: 'meeting',
        date: new Date(event.startTime),
        calendarId: event.calendarId // Pass through calendar ID for color
      })
    })
  }

  // Filter by provider accounts
  if (selectedProviders.value.length === 0) {
    // If no providers are selected, only show events without a calendarId
    result = result.filter(event => !event.calendarId)
  } else if (connectedAccounts.value.length > 0) {
    result = result.filter(event =>
      !event.calendarId || // Include events without calendar ID (like tasks)
      selectedProviders.value.includes(event.calendarId)
    )
  }

  return result
})

// Navigation handlers
const handleNavigation = (direction: string) => {
  if (direction === 'previous') {
    navigatePrevious()
  } else if (direction === 'next') {
    navigateNext()
  } else if (direction === 'today') {
    navigateToday()
  }
}

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

// Selection handlers
const selectDay = (date: Date) => {
  selectedDate.value = date.toISOString().slice(0, 10)

  if (currentView.value === 'month') {
    currentView.value = 'day'
  }
}

const selectDayFromWeekView = (date: Date) => {
  selectedDate.value = date.toISOString().slice(0, 10)
  currentView.value = 'day'
}

const selectWeek = (date: Date) => {
  selectedDate.value = date.toISOString().slice(0, 10)
  currentView.value = 'week'
}

// Event helpers
const getEventsForDay = (date: Date | null) => {
  if (!date) { return [] }

  return combinedEvents.value.filter((event) => {
    if (!event || !event.date) { return false }
    try {
      const eventDate = new Date(event.date)
      return isSameDay(eventDate, date)
    } catch (e) {
      return false
    }
  })
}

const getEventsForHour = (date: Date | null, hour: number | undefined) => {
  if (!date || hour === undefined) { return [] }

  return combinedEvents.value.filter((event) => {
    if (!event || !event.date || !event.startTime) { return false }

    try {
      const eventDate = new Date(event.date)
      return isSameDay(eventDate, date) && event.startTime.getHours() === hour
    } catch (e) {
      return false
    }
  }).map((event) => {
    // Calculate position and size in the hour slot
    const startTime = event.startTime
    const endTime = event.endTime || new Date(startTime.getTime() + 30 * 60 * 1000)

    const minutesFromHourStart = startTime.getMinutes()
    const durationHours = (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000)

    return {
      ...event,
      minutesFromHourStart,
      durationHours,
      providerColor: event.calendarId ? getProviderColor(event.calendarId) : 'primary'
    }
  })
}
</script>

<style>
.account-indicator {
  position: absolute;
  left: 0;
  height: 100%;
  width: 4px;
  border-radius: 2px 0 0 2px;
}
</style>
