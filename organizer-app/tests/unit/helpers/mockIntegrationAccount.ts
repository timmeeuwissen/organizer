import type { IntegrationAccount } from '~/types/models'

const futureExpiry = () => new Date(Date.now() + 3_600_000)

export function googleIntegrationAccount (
  overrides: Partial<IntegrationAccount> = {}
): IntegrationAccount {
  const { oauthData: oauthOverrides, ...rest } = overrides
  const oauth = {
    connected: true,
    email: 'user@example.com',
    name: 'Test User',
    accessToken: 'test-google-access-token',
    refreshToken: 'test-google-refresh',
    tokenExpiry: futureExpiry(),
    scope:
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
    ...oauthOverrides
  }
  return {
    id: 'acc-google-1',
    type: 'google',
    color: '#1a73e8',
    syncCalendar: true,
    syncMail: true,
    syncTasks: true,
    syncContacts: true,
    showInCalendar: true,
    showInMail: true,
    showInTasks: true,
    showInContacts: true,
    oauthData: oauth,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
    oauthData: oauth
  }
}

export function office365IntegrationAccount (
  overrides: Partial<IntegrationAccount> = {}
): IntegrationAccount {
  const { oauthData: oauthOverrides, ...rest } = overrides
  const oauth = {
    connected: true,
    email: 'msuser@example.com',
    name: 'MS User',
    accessToken: 'test-ms-access-token',
    refreshToken: 'test-ms-refresh',
    tokenExpiry: futureExpiry(),
    scope:
      'Mail.Read Calendars.Read Contacts.Read Tasks.ReadWrite offline_access',
    ...oauthOverrides
  }
  return {
    id: 'acc-ms-1',
    type: 'office365',
    color: '#0078d4',
    syncCalendar: true,
    syncMail: true,
    syncTasks: true,
    syncContacts: true,
    showInCalendar: true,
    showInMail: true,
    showInTasks: true,
    showInContacts: true,
    oauthData: oauth,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
    oauthData: oauth
  }
}

export function exchangeIntegrationAccount (
  overrides: Partial<IntegrationAccount> = {}
): IntegrationAccount {
  return office365IntegrationAccount({
    ...overrides,
    id: overrides.id ?? 'acc-exch-1',
    type: 'exchange'
  })
}
