import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exchangeIntegrationAccount } from '../../../helpers/mockIntegrationAccount'
import { jsonResponse } from '../../../helpers/mockFetch'
import { ExchangeTasksProvider } from '~/utils/api/taskProviders/ExchangeTasksProvider'

describe('ExchangeTasksProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function proxyTasksFetch (input: RequestInfo) {
    const raw = typeof input === 'string' ? input : String(input)
    if (!raw.includes('/api/proxy')) {
      return jsonResponse({})
    }
    const u = new URL(raw, 'http://localhost')
    const target = decodeURIComponent(u.searchParams.get('url') || '')
    if (/\/me\/todo\/lists($|\?)/.test(target)) {
      return jsonResponse({
        value: [{ id: 'exchange-list-1', displayName: 'Tasks' }]
      })
    }
    if (/\/me\/todo\/lists\/[^/]+\/tasks($|\?)/.test(target)) {
      return jsonResponse({
        value: [
          {
            id: 'exchange-task-1',
            title: 'Exchange Graph task',
            status: 'notStarted',
            importance: 'normal',
            createdDateTime: '2024-01-01T00:00:00Z',
            lastModifiedDateTime: '2024-01-01T00:00:00Z'
          }
        ]
      })
    }
    return jsonResponse({ value: [] })
  }

  it('fetchTasks returns tasks from Microsoft Graph via proxy', async () => {
    const acc = exchangeIntegrationAccount({
      oauthData: {
        ...exchangeIntegrationAccount().oauthData,
        tokenExpiry: new Date(Date.now() + 60 * 60 * 1000)
      }
    })
    vi.mocked(fetch).mockImplementation(input =>
      Promise.resolve(proxyTasksFetch(input as RequestInfo))
    )

    const p = new ExchangeTasksProvider(acc)
    const res = await p.fetchTasks({})

    expect(res.success).toBe(true)
    expect(res.tasks.some(t => t.title === 'Exchange Graph task')).toBe(true)
  })

  it('createTask posts to the default task list', async () => {
    const acc = exchangeIntegrationAccount({
      oauthData: {
        ...exchangeIntegrationAccount().oauthData,
        tokenExpiry: new Date(Date.now() + 60 * 60 * 1000)
      }
    })
    vi.mocked(fetch).mockImplementation((input) => {
      const raw = typeof input === 'string' ? input : String(input)
      if (!raw.includes('/api/proxy')) { return Promise.resolve(jsonResponse({})) }
      const u = new URL(raw, 'http://localhost')
      const target = decodeURIComponent(u.searchParams.get('url') || '')
      if (/\/me\/todo\/lists($|\?)/.test(target)) {
        return Promise.resolve(jsonResponse({ value: [{ id: 'list-1', displayName: 'Tasks' }] }))
      }
      if (/\/me\/todo\/lists\/list-1\/tasks$/.test(target)) {
        return Promise.resolve(jsonResponse({ id: 'new-task-id', title: 'New task' }))
      }
      return Promise.resolve(jsonResponse({ value: [] }))
    })

    const p = new ExchangeTasksProvider(acc)
    const res = await p.createTask({ title: 'New task', status: 'todo', priority: 'medium' })

    expect(res.success).toBe(true)
    expect(res.taskId).toBe('new-task-id')
  })
})
