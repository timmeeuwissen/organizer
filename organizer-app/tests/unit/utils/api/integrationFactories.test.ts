import { describe, it, expect } from 'vitest'
import type { IntegrationAccount } from '~/types/models'
import { getCalendarProvider } from '~/utils/api/calendarProviders'
import { getContactProvider } from '~/utils/api/contactProviders'
import { getTaskProvider } from '~/utils/api/taskProviders'
import { GoogleCalendarProvider } from '~/utils/api/calendarProviders/GoogleCalendarProvider'
import { GoogleContactsProvider } from '~/utils/api/contactProviders/GoogleContactsProvider'
import { GoogleTasksProvider } from '~/utils/api/taskProviders/GoogleTasksProvider'
import { Office365CalendarProvider } from '~/utils/api/calendarProviders/Office365CalendarProvider'
import {
  googleIntegrationAccount,
  office365IntegrationAccount,
} from '../../helpers/mockIntegrationAccount'

describe('integration provider factories', () => {
  it('getCalendarProvider maps google and office365', () => {
    expect(getCalendarProvider(googleIntegrationAccount())).toBeInstanceOf(
      GoogleCalendarProvider
    )
    expect(
      getCalendarProvider(office365IntegrationAccount())
    ).toBeInstanceOf(Office365CalendarProvider)
  })

  it('getContactProvider maps google', () => {
    expect(getContactProvider(googleIntegrationAccount())).toBeInstanceOf(
      GoogleContactsProvider
    )
  })

  it('getTaskProvider maps google', () => {
    expect(getTaskProvider(googleIntegrationAccount())).toBeInstanceOf(
      GoogleTasksProvider
    )
  })

  it('throws on unsupported calendar account type', () => {
    const acc = {
      ...googleIntegrationAccount(),
      type: 'bad',
    } as unknown as IntegrationAccount
    expect(() => getCalendarProvider(acc)).toThrow(/Unsupported account type/)
  })
})
