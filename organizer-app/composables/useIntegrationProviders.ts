import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export type IntegrationType = 'tasks' | 'calendar' | 'contacts' | 'mail'

interface Integration {
  id: string;
  provider: string;
  name?: string;
  email: string;
  syncTasks: boolean;
  syncCalendar: boolean;
  syncContacts: boolean;
  syncMail: boolean;
}

interface Provider {
  id: string;
  name: string;
}

export function useIntegrationProviders() {
  const i18n = useI18n()
  
  // Mock data for integrations - in a real app, this would be fetched from user profile
  // or from a dedicated integration store
  const mockIntegrations = ref<Integration[]>([
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
  ])

  // Function to get available providers based on integration type
  const getProvidersForType = (type: IntegrationType): Provider[] => {
    // Default provider is always available
    const providers: Provider[] = [
      {
        id: 'organizer',
        name: i18n.t('common.organizerApplication')
      }
    ]

    // In a real application, this would filter the user's integrations based on
    // their capabilities and return only those that support the requested type
    
    if (type === 'tasks') {
      // Filter integrations that support tasks
      const taskProviders = mockIntegrations.value
        .filter((integration: Integration) => integration.syncTasks)
        .map((integration: Integration) => ({
          id: integration.id,
          name: integration.name || `${integration.provider} (${integration.email})`
        }))
      
      return [...providers, ...taskProviders]
    }
    
    if (type === 'calendar') {
      // Filter integrations that support calendar
      const calendarProviders = mockIntegrations.value
        .filter((integration: Integration) => integration.syncCalendar)
        .map((integration: Integration) => ({
          id: integration.id,
          name: integration.name || `${integration.provider} (${integration.email})`
        }))
      
      return [...providers, ...calendarProviders]
    }
    
    if (type === 'contacts') {
      // Filter integrations that support contacts
      const contactProviders = mockIntegrations.value
        .filter((integration: Integration) => integration.syncContacts)
        .map((integration: Integration) => ({
          id: integration.id,
          name: integration.name || `${integration.provider} (${integration.email})`
        }))
      
      return [...providers, ...contactProviders]
    }
    
    if (type === 'mail') {
      // Filter integrations that support mail
      const mailProviders = mockIntegrations.value
        .filter((integration: Integration) => integration.syncMail)
        .map((integration: Integration) => ({
          id: integration.id,
          name: integration.name || `${integration.provider} (${integration.email})`
        }))
      
      return [...providers, ...mailProviders]
    }
    
    return providers
  }

  // Computed functions for each type
  const taskProviders = computed(() => getProvidersForType('tasks'))
  const calendarProviders = computed(() => getProvidersForType('calendar'))
  const contactProviders = computed(() => getProvidersForType('contacts'))
  const mailProviders = computed(() => getProvidersForType('mail'))

  return {
    getProvidersForType,
    taskProviders,
    calendarProviders,
    contactProviders,
    mailProviders
  }
}
