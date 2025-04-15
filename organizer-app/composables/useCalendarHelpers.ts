import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

/**
 * Composable that provides common calendar helper functions
 */
export function useCalendarHelpers() {
  const authStore = useAuthStore()
  
  /**
   * Get the user's preferred week start day (0 = Sunday, 1 = Monday, etc.)
   * Defaults to Monday (1) if not set
   */
  const getWeekStartDay = () => {
    if (!authStore.currentUser?.settings?.weekStartsOn) {
      return 1 // Default to Monday
    }
    return authStore.currentUser.settings.weekStartsOn
  }
  
  /**
   * Checks if two dates represent the same day
   */
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
  }

  /**
   * Checks if a date is today
   */
  const isToday = (date: Date) => {
    const today = new Date()
    return isSameDay(date, today)
  }

  /**
   * Get the first day of the month for a given date
   */
  const getFirstDayOfMonth = (date: Date) => {
    const d = new Date(date)
    d.setDate(1)
    return d
  }

  /**
   * Get the number of days in a month for a given date
   */
  const getDaysInMonth = (date: Date) => {
    const d = new Date(date)
    const month = d.getMonth()
    d.setMonth(month + 1)
    d.setDate(0)
    return d.getDate()
  }

  /**
   * Format a date as a readable string
   */
  const formatDate = (date: Date) => {
    if (!date) return ''
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  /**
   * Format event time as a readable string
   */
  const formatEventTime = (event: any) => {
    if (!event || !event.startTime) return ''
    
    let timeStr = event.startTime.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    if (event.endTime) {
      timeStr += ' - ' + event.endTime.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    
    return timeStr
  }

  /**
   * Gets an event's type CSS class
   */
  const getEventTypeClass = (event: any) => {
    if (!event || !event.type) return ''
    return event.type
  }

  /**
   * Gets an event's CSS class
   */
  const getEventClass = (event: any) => {
    if (!event || !event.type) return ''
    return `event-${event.type}`
  }

  /**
   * Gets an icon based on event type
   */
  const getEventIcon = (type: string) => {
    if (!type) return 'mdi-calendar'
    
    switch (type) {
      case 'meeting': return 'mdi-account-group'
      case 'task': return 'mdi-checkbox-marked-outline'
      default: return 'mdi-calendar'
    }
  }

  /**
   * Gets a link to an event detail page
   */
  const getEventLink = (event: any) => {
    if (!event || !event.type || !event.id) return '#'
    
    if (event.type === 'meeting') {
      return `/meetings/${event.id}`
    } else if (event.type === 'task') {
      return `/tasks?id=${event.id}`
    }
    
    return '#'
  }

  /**
   * Get ISO week number for a date
   * This is the proper ISO 8601 week number calculation
   */
  const getWeekNumber = (date: Date) => {
    const target = new Date(date.valueOf())
    const dayNumber = (date.getDay() + 6) % 7 // ISO 8601 weekday (Mon = 0, Sun = 6)
    
    // Set to nearest Thursday (week number is determined by Thursday)
    target.setDate(target.getDate() - dayNumber + 3)
    
    // Get first day of year
    const firstThursday = new Date(target.getFullYear(), 0, 1)
    if (firstThursday.getDay() !== 4) {
      firstThursday.setMonth(0, 1 + ((4 - firstThursday.getDay()) + 7) % 7)
    }
    
    // Calculate week number: get days between target date and first Thursday
    const days = (target.getTime() - firstThursday.getTime()) / 86400000
    return 1 + Math.floor(days / 7)
  }
  
  /**
   * Get an array of day names based on the user's preferred week start day
   */
  const getWeekDayNames = (format: 'short' | 'long' = 'short') => {
    const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const longDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    const weekStartDay = getWeekStartDay()
    const days = format === 'short' ? shortDays : longDays
    
    // Reorder days based on the week start day
    return [...days.slice(weekStartDay), ...days.slice(0, weekStartDay)]
  }
  
  /**
   * Get the first day of the week for a specific date based on user preferences
   */
  const getFirstDayOfWeek = (date: Date) => {
    const weekStartDay = getWeekStartDay()
    const day = date.getDay()
    const diff = (day - weekStartDay + 7) % 7
    
    const firstDay = new Date(date)
    firstDay.setDate(date.getDate() - diff)
    return firstDay
  }

  return {
    isSameDay,
    isToday,
    getFirstDayOfMonth,
    getDaysInMonth,
    formatDate,
    formatEventTime,
    getEventTypeClass,
    getEventClass,
    getEventIcon,
    getEventLink,
    getWeekNumber,
    getWeekStartDay,
    getWeekDayNames,
    getFirstDayOfWeek
  }
}
