import type { ModuleIntegrationFilterKind } from '~/config/moduleIntegration'
import type { IntegrationAccount } from '~/types/models'

function isConnected (account: IntegrationAccount): boolean {
  return Boolean(account.oauthData?.connected)
}

/**
 * Returns integration accounts eligible for the given module filter (matches previous per-page logic).
 */
export function filterIntegrationAccountsByKind (
  accounts: IntegrationAccount[] | undefined,
  kind: ModuleIntegrationFilterKind
): IntegrationAccount[] {
  const list = accounts ?? []
  switch (kind) {
    case 'mail':
      return list.filter(
        a => isConnected(a) && a.syncMail && a.showInMail
      )
    case 'calendar':
      return list.filter(
        a => isConnected(a) && a.syncCalendar && a.showInCalendar
      )
    case 'tasks':
      return list.filter(
        a => isConnected(a) && a.syncTasks && a.showInTasks
      )
    case 'contacts':
      return list.filter(
        a => isConnected(a) && a.syncContacts && a.showInContacts
      )
    case 'meetings':
      return list.filter(a => isConnected(a) && a.syncCalendar)
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
