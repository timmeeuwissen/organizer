import { describe, expect, it } from 'vitest'
import { filterIntegrationAccountsByKind } from '~/utils/filterIntegrationAccountsByKind'
import type { IntegrationAccount } from '~/types/models'

function baseAccount(overrides: Partial<IntegrationAccount> = {}): IntegrationAccount {
  const now = new Date()
  return {
    id: 'a1',
    type: 'google',
    color: '#2196F3',
    syncCalendar: true,
    syncMail: true,
    syncTasks: true,
    syncContacts: true,
    showInCalendar: true,
    showInMail: true,
    showInTasks: true,
    showInContacts: true,
    oauthData: {
      connected: true,
      email: 'u@example.com',
      name: 'User',
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('filterIntegrationAccountsByKind', () => {
  it('mail: requires syncMail, showInMail, connected', () => {
    const list = [
      baseAccount({ id: 'm', syncMail: true, showInMail: true }),
      baseAccount({ id: 'x', syncMail: false, showInMail: true }),
      baseAccount({ id: 'y', syncMail: true, showInMail: false }),
      baseAccount({
        id: 'z',
        syncMail: true,
        showInMail: true,
        oauthData: { connected: false, email: 'z', name: 'Z' },
      }),
    ]
    const r = filterIntegrationAccountsByKind(list, 'mail')
    expect(r.map((a) => a.id)).toEqual(['m'])
  })

  it('calendar: requires syncCalendar, showInCalendar, connected', () => {
    const list = [
      baseAccount({ id: 'c', syncCalendar: true, showInCalendar: true }),
      baseAccount({ id: 'n', showInCalendar: false }),
    ]
    expect(filterIntegrationAccountsByKind(list, 'calendar').map((a) => a.id)).toEqual(['c'])
  })

  it('tasks: requires syncTasks, showInTasks, connected', () => {
    const list = [baseAccount({ id: 't', showInTasks: false })]
    expect(filterIntegrationAccountsByKind(list, 'tasks')).toEqual([])
  })

  it('contacts: requires syncContacts, showInContacts, connected', () => {
    const list = [baseAccount({ id: 'p', showInContacts: false })]
    expect(filterIntegrationAccountsByKind(list, 'contacts')).toEqual([])
  })

  it('meetings: requires syncCalendar and connected only (no showIn flag)', () => {
    const list = [
      baseAccount({
        id: 'cal',
        syncCalendar: true,
        showInCalendar: false,
        oauthData: { connected: true, email: 'x', name: 'n' },
      }),
    ]
    expect(filterIntegrationAccountsByKind(list, 'meetings').map((a) => a.id)).toEqual(['cal'])
  })

  it('treats undefined accounts as empty', () => {
    expect(filterIntegrationAccountsByKind(undefined, 'mail')).toEqual([])
  })
})
