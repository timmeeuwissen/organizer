import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Office365CalendarProvider } from '~/utils/api/calendarProviders/Office365CalendarProvider'
import { office365IntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'

describe('Office365CalendarProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchEvents calls Graph me/events and maps items', async () => {
    const acc = office365IntegrationAccount()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        value: [
          {
            id: 'ev1',
            subject: 'Sync',
            start: { dateTime: '2024-05-01T09:00:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2024-05-01T10:00:00.0000000', timeZone: 'UTC' },
            isAllDay: false,
          },
        ],
      })
    )

    const p = new Office365CalendarProvider(acc)
    const res = await p.fetchEvents({
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-05-02'),
    })

    expect(res.events.length).toBeGreaterThanOrEqual(1)
    expect(res.events[0].title).toBe('Sync')
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('graph.microsoft.com/v1.0/me/events')
  })
})
