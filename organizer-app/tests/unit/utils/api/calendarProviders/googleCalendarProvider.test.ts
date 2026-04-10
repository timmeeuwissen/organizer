import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { googleIntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'
import { GoogleCalendarProvider } from '~/utils/api/calendarProviders/GoogleCalendarProvider'

describe('GoogleCalendarProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function calendarAccount () {
    return googleIntegrationAccount({
      oauthData: {
        ...googleIntegrationAccount().oauthData,
        scope: 'https://www.googleapis.com/auth/calendar.readonly'
      }
    })
  }

  it('fetchEvents requests calendar v3 events endpoint', async () => {
    const acc = calendarAccount()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: 'e1',
            summary: 'Meet',
            start: { dateTime: '2024-06-01T10:00:00Z' },
            end: { dateTime: '2024-06-01T11:00:00Z' }
          }
        ]
      })
    )

    const p = new GoogleCalendarProvider(acc)
    const start = new Date('2024-06-01T00:00:00Z')
    const end = new Date('2024-06-30T00:00:00Z')
    const res = await p.fetchEvents({ startDate: start, endDate: end })

    expect(res.events).toHaveLength(1)
    expect(res.events[0].title).toBe('Meet')
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('www.googleapis.com/calendar/v3/calendars')
    expect(url).toContain('/events')
    expect(url).toContain('timeMin=')
    expect(url).toContain('timeMax=')
  })

  it('fetchEvents returns empty on HTTP error', async () => {
    const acc = calendarAccount()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' })
    )
    const p = new GoogleCalendarProvider(acc)
    const res = await p.fetchEvents({})
    expect(res.events).toEqual([])
    expect(res.hasMore).toBe(false)
  })
})
