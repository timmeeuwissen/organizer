<template lang="pug">
v-app
  v-navigation-drawer(v-if="isAuthenticated" v-model="drawer" app)
    v-list
      v-list-item(prepend-avatar="/favicon.ico" :title="$t('common.appName')" to="/dashboard")
      v-divider
      v-list-item(v-for="(item, i) in navItems" :key="i" :to="item.to" :prepend-icon="item.icon" :title="$t(item.title)")
  
  v-app-bar(app)
    v-app-bar-nav-icon(v-if="isAuthenticated" @click.stop="drawer = !drawer")
    v-app-bar-title {{ $t('common.appName') }}
    v-spacer
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import { useAuthStore } from '~/stores/auth'
import { useRouter } from 'vue-router'
import { useDataRefresh } from '~/composables/useDataRefresh'
import DemoModeToggle from '~/components/auth/DemoModeToggle.vue'
import FeedbackButton from '~/components/feedback/FeedbackButton.vue'

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

const navItems = [
  // Dashboard is already linked at the top of the nav drawer, so this avoids the duplicate ID error
  // { title: 'dashboard.title', icon: 'mdi-view-dashboard', to: '/dashboard' },
  { title: 'behaviors.title', icon: 'mdi-account-cog', to: '/behaviors' },
  { title: 'people.title', icon: 'mdi-account-group', to: '/people' },
  { title: 'projects.title', icon: 'mdi-folder-multiple', to: '/projects' },
  { title: 'tasks.title', icon: 'mdi-checkbox-marked-outline', to: '/tasks' },
  { title: 'calendar.title', icon: 'mdi-calendar', to: '/calendar' },
  { title: 'meetings.title', icon: 'mdi-account-group-outline', to: '/meetings' },
  { title: 'mail.title', icon: 'mdi-email', to: '/mail' },
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
</script>
