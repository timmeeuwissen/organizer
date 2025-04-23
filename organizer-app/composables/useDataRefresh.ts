import { ref } from 'vue'
import { useMailStore } from '~/stores/mail'
import { useCalendarStore } from '~/stores/calendar'
import { usePeopleStore } from '~/stores/people'
import { useAuthStore } from '~/stores/auth'
import { getMailProvider } from '~/utils/api/mailProviders'
import { getCalendarProvider } from '~/utils/api/calendarProviders'
import { createContactsProvider } from '~/utils/api/contactProviders'

/**
 * Composable for refreshing data from all connected providers
 */
export function useDataRefresh() {
  const isRefreshing = ref(false)
  const lastRefreshed = ref<Date | null>(null)
  const refreshError = ref<string | null>(null)
  
  // Get stores
  const mailStore = useMailStore()
  const calendarStore = useCalendarStore()
  const peopleStore = usePeopleStore()
  const authStore = useAuthStore()
  
  /**
   * Refresh data from all connected providers
   */
  async function refreshAllData() {
    if (isRefreshing.value) return
    isRefreshing.value = true
    refreshError.value = null
    
    try {
      console.log('Starting data refresh from all providers')
      
      // Get all connected accounts
      const accounts = authStore.currentUser?.settings?.integrationAccounts || []
      
      if (accounts.length === 0) {
        console.log('No connected accounts found')
        return
      }
      
      // Initialize counters for completed operations
      let succeededCount = 0
      let failedCount = 0
      
      // Process each account
      for (const account of accounts) {
        console.log(`Processing account: ${account.oauthData.email}`)
        
        try {
          // Attempt to refresh tokens if needed
          if (!account.oauthData.connected || !account.oauthData.accessToken) {
            console.log(`Account ${account.oauthData.email} is not connected, skipping`)
            continue
          }
          
          // Refresh email data if this account has email enabled
          if (account.syncMail && account.showInMail) {
            try {
              console.log(`Refreshing mail data for ${account.oauthData.email}`)
              const mailProvider = getMailProvider(account)
              
              // Authenticate if needed
              if (!mailProvider.isAuthenticated()) {
                const authenticated = await mailProvider.authenticate()
                if (!authenticated) {
                  console.warn(`Mail authentication failed for ${account.oauthData.email}`)
                  failedCount++
                  continue
                }
              }
              
              // Refresh mail data
              await mailStore.loadFolderCounts()
              await mailStore.fetchEmails()
              succeededCount++
            } catch (error) {
              console.error(`Error refreshing mail for ${account.oauthData.email}:`, error)
              failedCount++
            }
          }
          
          // Refresh calendar data if this account has calendar enabled
          if (account.syncCalendar && account.showInCalendar) {
            try {
              console.log(`Refreshing calendar data for ${account.oauthData.email}`)
              const calendarProvider = getCalendarProvider(account)
              
              // Authenticate if needed
              if (!calendarProvider.isAuthenticated()) {
                const authenticated = await calendarProvider.authenticate()
                if (!authenticated) {
                  console.warn(`Calendar authentication failed for ${account.oauthData.email}`)
                  failedCount++
                  continue
                }
              }
              
              // Set date range for calendar query
              const today = new Date()
              const startDate = new Date(today)
              startDate.setDate(1) // First day of current month
              
              const endDate = new Date(today)
              endDate.setMonth(endDate.getMonth() + 1)
              endDate.setDate(0) // Last day of current month


              // Refresh calendar data
              await calendarStore.fetchEvents({startDate, endDate})
              succeededCount++
            } catch (error) {
              console.error(`Error refreshing calendar for ${account.oauthData.email}:`, error)
              failedCount++
            }
          }
          
          // Refresh contacts data if this account has contacts enabled
          if (account.syncContacts && account.showInContacts) {
            try {
              console.log(`Refreshing contacts data for ${account.oauthData.email}`)
              const contactsProvider = createContactsProvider(account)
              
              // Authenticate if needed
              if (!contactsProvider.isAuthenticated()) {
                const authenticated = await contactsProvider.authenticate()
                if (!authenticated) {
                  console.warn(`Contacts authentication failed for ${account.oauthData.email}`)
                  failedCount++
                  continue
                }
              }
              
              // Refresh contacts data
              try {
                await peopleStore.fetchContactsFromProvider(account)
                succeededCount++
              } catch (contactError) {
                console.error(`Error in contact provider for ${account.oauthData.email}:`, contactError)
                // Continue with other operations even if contact sync fails
                failedCount++
              }
            } catch (error) {
              console.error(`Error refreshing contacts for ${account.oauthData.email}:`, error)
              failedCount++
            }
          }
          
        } catch (error) {
          console.error(`Error processing account ${account.oauthData.email}:`, error)
          failedCount++
        }
      }
      
      // Update last refreshed timestamp
      lastRefreshed.value = new Date()
      
      // Log refresh summary
      console.log(`Data refresh complete: ${succeededCount} operations succeeded, ${failedCount} failed`)
      
      // Set error if all operations failed
      if (failedCount > 0 && succeededCount === 0) {
        refreshError.value = 'Failed to refresh data from all providers'
      }
    } catch (error: any) {
      console.error('Error in refreshAllData:', error)
      refreshError.value = error.message || 'Unknown error refreshing data'
    } finally {
      isRefreshing.value = false
    }
  }
  
  return {
    isRefreshing,
    lastRefreshed,
    refreshError,
    refreshAllData
  }
}
