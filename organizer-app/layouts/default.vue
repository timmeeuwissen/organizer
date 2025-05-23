<template lang="pug">
v-app
  v-navigation-drawer(v-if="isAuthenticated" v-model="drawer" app)
    v-list
      v-list-item(prepend-avatar="/favicon.ico" :title="$t('common.appName')" to="/dashboard")
      v-divider
      template(v-for="(item, i) in navItems" :key="i")
        v-list-item(
          :to="item.to" 
          :prepend-icon="item.icon" 
          :title="$t(item.title)"
          :class="{ 'parent-active': isParentActive(item) }"
        )
          template(v-slot:append v-if="item.addAction")
            v-btn(icon variant="text" size="small" @click.stop.prevent="item.addAction")
              v-icon mdi-plus
        
        // Nested menu items
        template(v-if="item.children && isParentActive(item)")
          v-list-item(
            v-for="(child, j) in item.children"
            :key="`${i}-${j}`"
            :to="child.to"
            :prepend-icon="child.icon"
            :title="$t(child.title)"
            class="nested-item"
          )
  
  v-app-bar(app)
    v-app-bar-nav-icon(v-if="isAuthenticated" @click.stop="drawer = !drawer")
    v-app-bar-title {{ $t('common.appName') }}
    v-spacer
    template(v-if="isAuthenticated")
      v-menu(location="bottom end" :offset="[0, 5]")
        template(v-slot:activator="{ props }")
          v-btn(icon v-bind="props" @click.stop)
            v-icon mdi-plus
        v-list
          v-list-item(
            v-for="(item, i) in addMenuItems" 
            :key="i" 
            @click.stop.prevent="item.action"
            :to="null"
          )
            template(v-slot:prepend)
              v-icon(:icon="item.icon" :color="item.color")
            v-list-item-title {{ item.title }}
    
    // AI button - only shown if AI integrations are enabled
    AIButton
    
    v-btn(icon @click="toggleTheme")
      v-icon {{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
    v-menu(location="bottom end" :offset="[0, 5]")
      template(v-slot:activator="{ props }")
        v-btn(icon v-bind="props")
          v-icon mdi-translate
      v-list
        v-list-item(@click="changeLocale('en')")
          v-list-item-title English
        v-list-item(@click="changeLocale('nl')")
          v-list-item-title Nederlands
    template(v-if="isAuthenticated")
      // Data refresh button
      v-tooltip(location="bottom")
        template(v-slot:activator="{ props }")
          v-btn(
            icon
            v-bind="props"
            @click="refreshAllData"
            :loading="isRefreshing"
            :disabled="isRefreshing"
            :color="refreshError ? 'error' : 'default'"
            :title="$t('common.refreshData')"
          )
            v-icon mdi-refresh
        span {{ $t('common.refreshData') }}
      v-btn(icon to="/auth/profile")
        v-icon mdi-account-circle
      v-btn(icon @click="logout" title="Logout")
        v-icon mdi-logout
  
  v-main
    v-container(fluid)
      DemoModeToggle(v-if="authBypassEnabled")
      slot
      
    // Feedback button that appears on all pages when authenticated
    FeedbackButton(v-if="isAuthenticated")
  
  v-footer(app padless)
    v-container
      v-row(justify="center" align="center")
        v-col(cols="12" class="text-center")
          span &copy; {{ new Date().getFullYear() }} — {{ $t('common.appName') }}
  
  // Global form dialogs
  dialog-form(v-model="taskDialog" max-width="800px")
    task-form(
      v-if="taskDialog"
      :loading="false" 
      @submit="onTaskSubmit"
    )
    
  dialog-form(v-model="personDialog" max-width="600px")
    person-form(
      v-if="personDialog"
      :loading="false"
      @submit="onPersonSubmit"
    )
    
  dialog-form(v-model="calendarDialog" max-width="800px")
    calendar-event-form(
      v-if="calendarDialog"
      :loading="false" 
      @submit="onCalendarEventSubmit"
    )
        
  dialog-form(v-model="mailDialog" max-width="800px")
    mail-compose-form(
      v-if="mailDialog"
      :loading="false" 
      @submit="onMailSubmit"
      @close="mailDialog = false"
    )
    
  dialog-form(v-model="behaviorDialog" max-width="700px")
    behavior-form(
      v-if="behaviorDialog"
      :loading="false" 
      @submit="onBehaviorSubmit"
    )
    
  dialog-form(v-model="projectDialog" max-width="800px")
    project-form(
      v-if="projectDialog"
      :loading="false" 
      @submit="onProjectSubmit"
    )
    
  dialog-form(v-model="meetingDialog" max-width="800px")
    meeting-form(
      v-if="meetingDialog"
      :loading="false" 
      @submit="onMeetingSubmit"
    )
    
  dialog-form(v-model="coachingDialog" max-width="800px")
    coaching-form(
      v-if="coachingDialog"
      :loading="false" 
      @submit="onCoachingSubmit"
    )
    
  // AI Analysis Dialog
  AIAnalysisDialog(v-model="showAiDialog")
  
  // Global notification system
  NotificationSnackbar
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import { useAuthStore } from '~/stores/auth'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '~/stores/notification'
import { useDataRefresh } from '~/composables/useDataRefresh'
import DemoModeToggle from '~/components/auth/DemoModeToggle.vue'
import FeedbackButton from '~/components/feedback/FeedbackButton.vue'
import DialogForm from '~/components/common/DialogForm.vue'
import TaskForm from '~/components/tasks/TaskForm.vue'
import PersonForm from '~/components/people/PersonForm.vue'
import { useTasksStore } from '~/stores/tasks'
import { usePeopleStore } from '~/stores/people'
import { useBehaviorsStore } from '~/stores/behaviors'
import { useProjectsStore } from '~/stores/projects'
import { useCoachingStore } from '~/stores/coaching'
import CalendarEventForm from '~/components/calendar/CalendarEventForm.vue'
import MailComposeForm from '~/components/mail/MailComposeForm.vue'
import BehaviorForm from '~/components/behaviors/BehaviorForm.vue'
import ProjectForm from '~/components/projects/ProjectForm.vue'
import MeetingForm from '~/components/meetings/MeetingForm.vue'
import CoachingForm from '~/components/coaching/CoachingForm.vue'
import AIAnalysisDialog from '~/components/ai/AIAnalysisDialog.vue'
import AIButton from '~/components/ai/AIButton.vue'
import NotificationSnackbar from '~/components/common/NotificationSnackbar.vue'

const i18n = useI18n()
const theme = useTheme()
const authStore = useAuthStore()
const router = useRouter()

// Data refresh
const { isRefreshing, lastRefreshed, refreshError, refreshAllData } = useDataRefresh()

const drawer = ref(false)
const isDarkTheme = computed(() => theme.global.current.value.dark)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const authBypassEnabled = computed(() => import.meta.env.VITE_AUTH_BYPASS === 'true')

// Check if user has any enabled AI integrations
const hasEnabledAiIntegrations = computed(() => {
  if (!authStore.currentUser?.settings?.aiIntegrations) return false
  return authStore.currentUser.settings.aiIntegrations.some(ai => ai.enabled)
})

// Add dialog states for each type
const taskDialog = ref(false)
const personDialog = ref(false)
const calendarDialog = ref(false)
const mailDialog = ref(false)
const behaviorDialog = ref(false)
const projectDialog = ref(false)
const meetingDialog = ref(false)
const coachingDialog = ref(false)
const showAiDialog = ref(false)

// Add Button Menu Items
const addMenuItems = [
  { 
    title: i18n.t('behaviors.add'), 
    icon: 'mdi-account-cog-outline', 
    color: 'indigo',
    action: () => behaviorDialog.value = true
  },
  { 
    title: i18n.t('projects.createProject'), 
    icon: 'mdi-folder-plus', 
    color: 'teal',
    action: () => projectDialog.value = true
  },
  { 
    title: i18n.t('tasks.addTask'), 
    icon: 'mdi-checkbox-marked-outline', 
    color: 'primary',
    action: () => taskDialog.value = true
  },
  { 
    title: i18n.t('people.addPerson'), 
    icon: 'mdi-account-plus', 
    color: 'success',
    action: () => personDialog.value = true
  },
  { 
    title: i18n.t('calendar.event'), 
    icon: 'mdi-calendar-plus', 
    color: 'info',
    action: () => calendarDialog.value = true
  },
  { 
    title: i18n.t('meetings.title'), 
    icon: 'mdi-account-group-outline', 
    color: 'deep-purple',
    action: () => meetingDialog.value = true
  },
  { 
    title: i18n.t('coaching.title'), 
    icon: 'mdi-account-heart', 
    color: 'pink',
    action: () => coachingDialog.value = true
  },
  { 
    title: i18n.t('mail.compose'), 
    icon: 'mdi-email-plus', 
    color: 'warning',
    action: () => mailDialog.value = true
  }
]

// Navigation Items with Add Actions
// Helper function to determine if a parent route is active
const isParentActive = (item) => {
  if (!item.to) return false
  
  // Check if current route starts with the parent route path
  const currentPath = window.location.pathname
  
  return currentPath.startsWith(item.to) 
}

const navItems = [
  // Dashboard is already linked at the top of the nav drawer, so this avoids the duplicate ID error
  // { title: 'dashboard.title', icon: 'mdi-view-dashboard', to: '/dashboard' },
  { 
    title: 'behaviors.title', 
    icon: 'mdi-account-cog', 
    to: '/behaviors',
    addAction: () => behaviorDialog.value = true
  },
  { 
    title: 'people.title', 
    icon: 'mdi-account-group', 
    to: '/people',
    addAction: () => personDialog.value = true
  },
  { 
    title: 'projects.title', 
    icon: 'mdi-folder-multiple', 
    to: '/projects',
    addAction: () => projectDialog.value = true
  },
  { 
    title: 'tasks.title', 
    icon: 'mdi-checkbox-marked-outline', 
    to: '/tasks',
    addAction: () => taskDialog.value = true
  },
  { 
    title: 'calendar.title', 
    icon: 'mdi-calendar', 
    to: '/calendar',
    addAction: () => calendarDialog.value = true
  },
  { 
    title: 'meetings.title', 
    icon: 'mdi-account-group-outline', 
    to: '/meetings',
    addAction: () => meetingDialog.value = true,
    children: [
      { 
        title: 'meetings.categoriesTitle',
        icon: 'mdi-tag-multiple-outline',
        to: '/meetings/categories'
      }
    ]
  },
  { 
    title: 'mail.title', 
    icon: 'mdi-email', 
    to: '/mail',
    addAction: () => mailDialog.value = true
  },
  { 
    title: 'coaching.title', 
    icon: 'mdi-account-heart', 
    to: '/coaching',
    addAction: () => coachingDialog.value = true
  },
  { title: 'statistics.title', icon: 'mdi-chart-bar', to: '/statistics' },
  { title: 'network.title', icon: 'mdi-graph', to: '/network' },
  { title: 'feedback.adminTitle', icon: 'mdi-message-text-outline', to: '/feedback' },
]

const toggleTheme = () => {
  theme.global.name.value = isDarkTheme.value ? 'light' : 'dark'
}

const changeLocale = (locale: string) => {
  i18n.locale.value = locale
}

const logout = async () => {
  try {
    await authStore.logout()
    router.push('/auth/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Store instances for form handling
const tasksStore = useTasksStore()
const peopleStore = usePeopleStore()
const behaviorsStore = useBehaviorsStore()
const projectsStore = useProjectsStore()
const coachingStore = useCoachingStore()

// Form submission handlers
const onTaskSubmit = async (taskData) => {
  try {
    // Check if we're using an external provider
    if (taskData.storageProvider === 'organizer') {
      // Store in organizer (Firestore)
      await tasksStore.createTask(taskData)
    } else {
      // Find the integration that matches the provider ID
      const integration = getIntegrationById(taskData.storageProvider)
      if (integration && integration.syncTasks) {
        // Handle external provider
        console.log(`Storing task in ${integration.provider} (${integration.email}):`, taskData)
        // In a real implementation, this would call the appropriate provider API
        // e.g., tasksStore.createExternalTask(integration, taskData)
      } else {
        throw new Error('Selected integration does not support tasks or is not connected')
      }
    }
    taskDialog.value = false
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}

const onPersonSubmit = async (personData) => {
  try {
    // Check if we're using an external provider
    if (personData.storageProvider === 'organizer') {
      // Store in organizer (Firestore)
      await peopleStore.createPerson(personData)
    } else {
      // Find the integration that matches the provider ID
      const integration = getIntegrationById(personData.storageProvider)
      if (integration && integration.syncContacts) {
        // Handle external provider
        console.log(`Storing contact in ${integration.provider} (${integration.email}):`, personData)
        // In a real implementation, this would call the appropriate provider API
        // e.g., peopleStore.createExternalContact(integration, personData)
      } else {
        throw new Error('Selected integration does not support contacts or is not connected')
      }
    }
    personDialog.value = false
  } catch (error) {
    console.error('Failed to create person:', error)
  }
}

// Calendar and mail handlers
const onCalendarEventSubmit = async (eventData) => {
  try {
    // Check if we're using an external provider
    if (eventData.storageProvider === 'organizer') {
      // Store in organizer (Firestore)
      // Placeholder for calendar event creation
      console.log('Calendar event created in Organizer:', eventData)
      // In a real implementation, this would call a calendar store method
      // e.g., calendarStore.createEvent(eventData)
    } else {
      // Find the integration that matches the provider ID
      const integration = getIntegrationById(eventData.storageProvider)
      if (integration && integration.syncCalendar) {
        // Handle external provider
        console.log(`Storing calendar event in ${integration.provider} (${integration.email}):`, eventData)
        // In a real implementation, this would call the appropriate provider API
        // e.g., calendarStore.createExternalEvent(integration, eventData)
      } else {
        throw new Error('Selected integration does not support calendar or is not connected')
      }
    }
    calendarDialog.value = false
  } catch (error) {
    console.error('Failed to create calendar event:', error)
  }
}

const onMailSubmit = async (mailData) => {
  try {
    // Check if we're using an external provider
    if (mailData.storageProvider === 'organizer') {
      // Store in organizer (Firestore)
      console.log('Mail stored/sent in Organizer:', mailData)
      // In a real implementation, this would call a mail store method
      // e.g., mailStore.sendMail(mailData)
    } else {
      // Find the integration that matches the provider ID
      const integration = getIntegrationById(mailData.storageProvider)
      if (integration && integration.syncMail) {
        // Handle external provider
        console.log(`Sending mail through ${integration.provider} (${integration.email}):`, mailData)
        // In a real implementation, this would call the appropriate provider API
        // e.g., mailStore.sendExternalMail(integration, mailData)
      } else {
        throw new Error('Selected integration does not support mail or is not connected')
      }
    }
    mailDialog.value = false
  } catch (error) {
    console.error('Failed to send mail:', error)
  }
}

// Behavior handler
const onBehaviorSubmit = async (behaviorData) => {
  try {
    // Store in organizer (Firestore)
    await behaviorsStore.createBehavior(behaviorData)
    behaviorDialog.value = false
  } catch (error) {
    console.error('Failed to create behavior:', error)
  }
}

// Project handler
const onProjectSubmit = async (projectData) => {
  try {
    // Store in organizer (Firestore)
    await projectsStore.createProject(projectData)
    projectDialog.value = false
  } catch (error) {
    console.error('Failed to create project:', error)
  }
}

// Meeting handler
const onMeetingSubmit = async (meetingData) => {
  try {
    // Store in organizer (Firestore)
    console.log('Meeting created in Organizer:', meetingData)
    // In a real implementation, this would call a meetings store method
    // e.g., meetingsStore.createMeeting(meetingData)
    meetingDialog.value = false
  } catch (error) {
    console.error('Failed to create meeting:', error)
  }
}

// Coaching handler
const onCoachingSubmit = async (coachingData) => {
  try {
    // Store in organizer (Firestore)
    await coachingStore.createRecord(coachingData)
    coachingDialog.value = false
  } catch (error) {
    console.error('Failed to create coaching record:', error)
  }
}

// Helper function to find an integration by its ID
// In a real app, this would come from the auth store or integration store
const getIntegrationById = (id) => {
  // This is a mock function that simulates getting integrations from the user's profile
  const mockIntegrations = [
    {
      id: 'google-1',
      provider: 'Google',
      email: 'user@gmail.com',
      syncTasks: true,
      syncCalendar: true,
      syncContacts: true,
      syncMail: true
    },
    {
      id: 'microsoft-1',
      provider: 'Microsoft',
      email: 'user@outlook.com',
      syncTasks: true,
      syncCalendar: true,
      syncContacts: true,
      syncMail: true
    },
    {
      id: 'exchange-1',
      provider: 'Exchange',
      email: 'user@company.com',
      syncTasks: false,
      syncCalendar: true,
      syncContacts: true,
      syncMail: true
    }
  ]
  
  return mockIntegrations.find(integration => integration.id === id)
}
</script>

<style>
.nested-item {
  padding-left: 56px !important;
}

.parent-active {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>
