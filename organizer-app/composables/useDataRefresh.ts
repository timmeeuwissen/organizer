import { ref } from 'vue'
import { useMailStore } from '~/stores/mail'
import { useCalendarStore } from '~/stores/calendar'
import { usePeopleStore } from '~/stores/people'
import { useAuthStore } from '~/stores/auth'
import { getMailProvider } from '~/utils/api/mailProviders'
import { getCalendarProvider } from '~/utils/api/calendarProviders'
import { createContactsProvider } from '~/utils/api/contactProviders'
import type { IntegrationAccount } from '~/types/models'

/**
 * Composable for refreshing data from all connected providers
 */
export function useDataRefresh () {
  const isRefreshing = ref(false)
  const lastRefreshed = ref<Date | null>(null)
  const refreshError = ref<string | null>(null)

  const mailStore = useMailStore()
  const calendarStore = useCalendarStore()
  const peopleStore = usePeopleStore()
  const authStore = useAuthStore()

  /**
   * Refresh mail data for a single account. Returns true on success.
   */
  async function refreshMail (account: IntegrationAccount): Promise<boolean> {
    const mailProvider = getMailProvider(account)
    if (!mailProvider.isAuthenticated()) {
      const ok = await mailProvider.authenticate()
      if (!ok) { return false }
    }
    await mailStore.loadFolderCounts()
    await mailStore.fetchEmails()
    return true
  }

  /**
   * Refresh calendar data for a single account. Returns true on success.
   */
  async function refreshCalendar (account: IntegrationAccount): Promise<boolean> {
    const calendarProvider = getCalendarProvider(account)
    if (!calendarProvider.isAuthenticated()) {
      const ok = await calendarProvider.authenticate()
      if (!ok) { return false }
    }
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    await calendarStore.fetchEvents({ startDate, endDate })
    return true
  }

  /**
   * Refresh contacts data for a single account. Returns true on success.
   */
  async function refreshContacts (account: IntegrationAccount): Promise<boolean> {
    const contactsProvider = createContactsProvider(account)
    if (!contactsProvider.isAuthenticated()) {
      const ok = await contactsProvider.authenticate()
      if (!ok) { return false }
    }
    await peopleStore.fetchContactsFromProvider(account)
    return true
  }

  /**
   * Run all enabled sync operations for one account in parallel.
   * Returns { succeeded, failed } counts.
   */
  async function refreshAccount (account: IntegrationAccount): Promise<{ succeeded: number; failed: number }> {
    if (!account.oauthData.connected || !account.oauthData.accessToken) {
      return { succeeded: 0, failed: 0 }
    }

    const ops: Promise<boolean>[] = []

    if (account.syncMail && account.showInMail) {
      ops.push(
        refreshMail(account).catch((err) => {
          console.error(`Error refreshing mail for ${account.oauthData.email}:`, err)
          return false
        })
      )
    }

    if (account.syncCalendar && account.showInCalendar) {
      ops.push(
        refreshCalendar(account).catch((err) => {
          console.error(`Error refreshing calendar for ${account.oauthData.email}:`, err)
          return false
        })
      )
    }

    if (account.syncContacts && account.showInContacts) {
      ops.push(
        refreshContacts(account).catch((err) => {
          console.error(`Error refreshing contacts for ${account.oauthData.email}:`, err)
          return false
        })
      )
    }

    const results = await Promise.all(ops)
    const succeeded = results.filter(Boolean).length
    const failed = results.length - succeeded
    return { succeeded, failed }
  }

  /**
   * Refresh data from all connected providers in parallel.
   */
  async function refreshAllData () {
    if (isRefreshing.value) { return }
    isRefreshing.value = true
    refreshError.value = null

    try {
      const accounts = authStore.currentUser?.settings?.integrationAccounts || []

      if (accounts.length === 0) { return }

      // Process all accounts in parallel
      const accountResults = await Promise.all(
        accounts.map(account =>
          refreshAccount(account).catch((err) => {
            console.error(`Error processing account ${account.oauthData.email}:`, err)
            return { succeeded: 0, failed: 1 }
          })
        )
      )

      const totalSucceeded = accountResults.reduce((sum, r) => sum + r.succeeded, 0)
      const totalFailed = accountResults.reduce((sum, r) => sum + r.failed, 0)

      lastRefreshed.value = new Date()

      if (totalFailed > 0 && totalSucceeded === 0) {
        refreshError.value = 'Failed to refresh data from all providers'
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error refreshing data'
      console.error('Error in refreshAllData:', error)
      refreshError.value = message
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
