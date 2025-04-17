import { ref, computed, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import type { FirebaseApp } from 'firebase/app'
import type { IntegrationAccount } from '~/types/models'

interface ProviderOption {
  id: string
  name: string
  account?: IntegrationAccount
}

export const useIntegrationProviders = () => {
  const authStore = useAuthStore()
  
  // Integration accounts from user settings
  const integrationAccounts: Ref<IntegrationAccount[]> = ref([])
  
  // Provider options for selection menus
  const mailProviders = computed<ProviderOption[]>(() => {
    const providers: ProviderOption[] = [
      { id: 'organizer', name: 'Organizer' }
    ]
    
    // Add connected mail providers
    const mailAccounts = integrationAccounts.value.filter(a => a.syncMail && a.oauthData.connected)
    
    mailAccounts.forEach(account => {
      providers.push({
        id: account.id,
        name: `${account.type === 'google' ? 'Gmail' : account.type === 'office365' ? 'Outlook' : 'Exchange'} (${account.oauthData.email})`,
        account
      })
    })
    
    return providers
  })
  
  const calendarProviders = computed<ProviderOption[]>(() => {
    const providers: ProviderOption[] = [
      { id: 'organizer', name: 'Organizer' }
    ]
    
    // Add connected calendar providers
    const calendarAccounts = integrationAccounts.value.filter(a => a.syncCalendar && a.oauthData.connected)
    
    calendarAccounts.forEach(account => {
      providers.push({
        id: account.id,
        name: `${account.type === 'google' ? 'Google Calendar' : account.type === 'office365' ? 'Outlook Calendar' : 'Exchange Calendar'} (${account.oauthData.email})`,
        account
      })
    })
    
    return providers
  })
  
  const contactProviders = computed<ProviderOption[]>(() => {
    const providers: ProviderOption[] = [
      { id: 'organizer', name: 'Organizer' }
    ]
    
    // Add connected contact providers
    const contactAccounts = integrationAccounts.value.filter(a => a.syncContacts && a.oauthData.connected)
    
    contactAccounts.forEach(account => {
      providers.push({
        id: account.id,
        name: `${account.type === 'google' ? 'Google Contacts' : account.type === 'office365' ? 'Outlook Contacts' : 'Exchange Contacts'} (${account.oauthData.email})`,
        account
      })
    })
    
    return providers
  })
  
  const taskProviders = computed<ProviderOption[]>(() => {
    const providers: ProviderOption[] = [
      { id: 'organizer', name: 'Organizer' }
    ]
    
    // Add connected task providers
    const taskAccounts = integrationAccounts.value.filter(a => a.syncTasks && a.oauthData.connected)
    
    taskAccounts.forEach(account => {
      providers.push({
        id: account.id,
        name: `${account.type === 'google' ? 'Google Tasks' : account.type === 'office365' ? 'Microsoft To Do' : 'Exchange Tasks'} (${account.oauthData.email})`,
        account
      })
    })
    
    return providers
  })
  
  // Initialize data
  onMounted(async () => {
    if (authStore.user) {
      const { $firebase } = useNuxtApp()
      const db = getFirestore($firebase as FirebaseApp)
      const userRef = doc(db, 'users', authStore.user.id)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists() && userSnap.data().settings?.integrationAccounts) {
        integrationAccounts.value = userSnap.data().settings.integrationAccounts
      }
    }
  })
  
  return {
    integrationAccounts,
    mailProviders,
    calendarProviders,
    contactProviders,
    taskProviders
  }
}
