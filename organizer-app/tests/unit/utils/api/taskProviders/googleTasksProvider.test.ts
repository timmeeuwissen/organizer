import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GoogleTasksProvider } from '~/utils/api/taskProviders/GoogleTasksProvider'
import { googleIntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'

describe('GoogleTasksProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function proxyHandler(input: RequestInfo) {
    const raw = typeof input === 'string' ? input : String(input)
    if (!raw.includes('/api/proxy')) {
      return jsonResponse({})
    }
    const u = new URL(raw, 'http://localhost')
    const target = decodeURIComponent(u.searchParams.get('url') || '')
    if (/\/users\/@me\/lists($|\?)/.test(target)) {
      return jsonResponse({
        items: [{ id: 'list-1', title: 'My list' }],
      })
    }
    if (/\/lists\/[^/]+\/tasks($|\?)/.test(target)) {
      return jsonResponse({
        items: [
          {
            id: 't1',
            title: 'Buy milk',
            status: 'needsAction',
            updated: '2024-01-01T00:00:00Z',
          },
        ],
      })
    }
    return jsonResponse({})
  }

  it('fetchTasks loads lists then tasks via proxy URL', async () => {
    const acc = googleIntegrationAccount()
    vi.mocked(fetch).mockImplementation((input) =>
      Promise.resolve(proxyHandler(input as RequestInfo))
    )

    const p = new GoogleTasksProvider(acc)
    const res = await p.fetchTasks({})

    expect(res.success).toBe(true)
    expect(res.tasks.length).toBeGreaterThanOrEqual(1)
    expect(res.tasks.some((t) => t.title === 'Buy milk')).toBe(true)
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
    expect(urls.some((u) => u.includes('/api/proxy'))).toBe(true)
    expect(
      urls.some((u) => decodeURIComponent(u).includes('tasks.googleapis.com'))
    ).toBe(true)
  })
})
