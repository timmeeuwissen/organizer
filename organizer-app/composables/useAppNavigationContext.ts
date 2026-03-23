import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const MODULE_I18N: Record<string, string> = {
  dashboard: 'dashboard.title',
  behaviors: 'behaviors.title',
  calendar: 'calendar.title',
  coaching: 'coaching.title',
  mail: 'mail.title',
  meetings: 'meetings.title',
  people: 'people.title',
  projects: 'projects.title',
  tasks: 'tasks.title',
  teams: 'teams.title',
  statistics: 'statistics.title',
  network: 'network.title',
  feedback: 'feedback.title',
  auth: 'auth.login',
}

/**
 * Breadcrumb trail and module label derived from the current route (incremental GUI rules alignment).
 */
export function useAppNavigationContext() {
  const route = useRoute()
  const { t } = useI18n()

  const segments = computed(() => {
    const parts = route.path.split('/').filter(Boolean)
    const items: { title: string; to?: string }[] = [
      { title: t('common.welcome'), to: '/dashboard' },
    ]
    if (parts.length === 0) {
      return items
    }
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      acc += `/${parts[i]}`
      const key = MODULE_I18N[parts[i]]
      const title = key ? String(t(key)) : parts[i]
      const isLast = i === parts.length - 1
      items.push({
        title,
        to: isLast ? undefined : acc,
      })
    }
    return items
  })

  const moduleTitle = computed(() => {
    const parts = route.path.split('/').filter(Boolean)
    const root = parts[0] || 'dashboard'
    const key = MODULE_I18N[root]
    return key ? String(t(key)) : root
  })

  return { segments, moduleTitle }
}
