import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Office365TasksProvider } from '~/utils/api/taskProviders/Office365TasksProvider'
import { office365IntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'

describe('Office365TasksProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function proxyTasksFetch(input: RequestInfo) {
    const raw = typeof input === 'string' ? input : String(input)
    if (!raw.includes('/api/proxy')) {
      return jsonResponse({})
    }
    const u = new URL(raw, 'http://localhost')
    const target = decodeURIComponent(u.searchParams.get('url') || '')
    if (/\/me\/todo\/lists($|\?)/.test(target)) {
      return jsonResponse({
        value: [{ id: 'todo-list-1', displayName: 'Tasks' }],
      })
    }
    if (/\/me\/todo\/lists\/[^/]+\/tasks($|\?)/.test(target)) {
      return jsonResponse({
        value: [
          {
            id: 'todo-1',
            title: 'Graph task',
            status: 'notStarted',
            createdDateTime: '2024-01-01T00:00:00Z',
            lastModifiedDateTime: '2024-01-01T00:00:00Z',
          },
        ],
      })
    }
    return jsonResponse({ value: [] })
  }

  it('fetchTasks returns tasks from Microsoft To Do via proxy', async () => {
    const acc = office365IntegrationAccount({
      oauthData: {
        ...office365IntegrationAccount().oauthData,
        tokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    })
    vi.mocked(fetch).mockImplementation((input) =>
      Promise.resolve(proxyTasksFetch(input as RequestInfo))
    )

    const p = new Office365TasksProvider(acc)
    const res = await p.fetchTasks({})

    expect(res.success).toBe(true)
    expect(res.tasks.some((t) => t.title === 'Graph task')).toBe(true)
  })
})
