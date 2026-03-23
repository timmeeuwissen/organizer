import type { IntegrationAccount } from '~/types/models'

export type IntegrationModuleKey = 'mail' | 'calendar' | 'tasks' | 'people' | 'meetings'

export type ModuleUsageState = 'off' | 'pending' | 'active'

export interface IntegrationModuleUsage {
  key: IntegrationModuleKey
  state: ModuleUsageState
}

function syncAndShow(sync: boolean, show: boolean): boolean {
  return !!(sync && show)
}

/**
 * Per-module usage for an integration account, aligned with how modules filter accounts:
 * - Mail, Calendar, Tasks, People: connected + sync* + showIn*
 * - Meetings: connected + syncCalendar (see pages/meetings/index.vue)
 */
export function getIntegrationModuleUsage(account: IntegrationAccount): IntegrationModuleUsage[] {
  const connected = !!account.oauthData?.connected

  const state = (enabledForModule: boolean): ModuleUsageState => {
    if (!enabledForModule) {
      return 'off'
    }
    if (!connected) {
      return 'pending'
    }
    return 'active'
  }

  const mailEnabled = syncAndShow(account.syncMail, account.showInMail)
  const calendarEnabled = syncAndShow(account.syncCalendar, account.showInCalendar)
  const tasksEnabled = syncAndShow(account.syncTasks, account.showInTasks)
  const peopleEnabled = syncAndShow(account.syncContacts, account.showInContacts)
  const meetingsEnabled = !!account.syncCalendar

  return [
    { key: 'mail', state: state(mailEnabled) },
    { key: 'calendar', state: state(calendarEnabled) },
    { key: 'tasks', state: state(tasksEnabled) },
    { key: 'people', state: state(peopleEnabled) },
    { key: 'meetings', state: state(meetingsEnabled) },
  ]
}
