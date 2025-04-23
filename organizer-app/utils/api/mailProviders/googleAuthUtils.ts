import { ref } from 'vue'
import type { IntegrationAccount } from '~/types/models'

// Create a reactive state to track which accounts need reauthorization
export const accountsNeedingReauth = ref<{[accountId: string]: boolean}>({})

/**
 * Mark an account as needing reauthorization
 * @param account The integration account
 */
export function markAccountForReauth(account: IntegrationAccount): void {
  if (!account?.id) return
  
  console.log(`Marking account ${account.oauthData.email} for reauthorization`)
  accountsNeedingReauth.value[account.id] = true
}

/**
 * Check if an account needs reauthorization
 * @param account The integration account
 * @returns Boolean indicating if the account needs reauth
 */
export function needsReauthorization(account: IntegrationAccount): boolean {
  if (!account?.id) return false
  return !!accountsNeedingReauth.value[account.id]
}

/**
 * Clear reauthorization status for an account
 * @param account The integration account
 */
export function clearReauthorizationStatus(account: IntegrationAccount): void {
  if (!account?.id) return
  
  console.log(`Clearing reauthorization status for ${account.oauthData.email}`)
  if (accountsNeedingReauth.value[account.id]) {
    delete accountsNeedingReauth.value[account.id]
  }
}
