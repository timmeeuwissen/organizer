import { describe, expect, it } from 'vitest'
import { getIntegrationModuleUsage } from '~/utils/integrationModuleUsage'
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

describe('getIntegrationModuleUsage', () => {
  it('returns active for all modules when connected and all sync/show flags on', () => {
    const u = getIntegrationModuleUsage(baseAccount())
    expect(u.every((x) => x.state === 'active')).toBe(true)
    expect(u.map((x) => x.key)).toEqual(['mail', 'calendar', 'tasks', 'people', 'meetings'])
  })

  it('returns pending when enabled but not connected', () => {
    const u = getIntegrationModuleUsage(
      baseAccount({ oauthData: { connected: false, email: 'u@x.com', name: 'U' } })
    )
    expect(u.every((x) => x.state === 'pending')).toBe(true)
  })

  it('returns off for mail when sync or show is false', () => {
    const u = getIntegrationModuleUsage(baseAccount({ syncMail: false }))
    expect(u.find((x) => x.key === 'mail')?.state).toBe('off')
  })

  it('meetings follows syncCalendar only', () => {
    const u = getIntegrationModuleUsage(
      baseAccount({ syncCalendar: true, showInCalendar: false, oauthData: { connected: true, email: 'x', name: 'n' } })
    )
    expect(u.find((x) => x.key === 'calendar')?.state).toBe('off')
    expect(u.find((x) => x.key === 'meetings')?.state).toBe('active')
  })
})
