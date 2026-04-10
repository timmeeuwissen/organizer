import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { addDoc, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date('2026-01-01')),
  getFirestore: vi.fn(() => ({})),
  Timestamp: { fromDate: (d: Date) => d, now: () => new Date() }
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'u1' },
    currentUser: { id: 'u1', settings: { integrationAccounts: [] } },
    updateUserSettings: vi.fn()
  }))
}))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }))
}))

vi.mock('~/utils/api/emailUtils', () => ({
  hasValidOAuthTokens: vi.fn(() => true),
  refreshOAuthToken: vi.fn(() => Promise.resolve('new-token'))
}))

vi.mock('~/utils/api/calendarProviders/index', () => ({
  getCalendarProvider: vi.fn(() => ({
    isAuthenticated: vi.fn(() => true),
    authenticate: vi.fn(() => Promise.resolve(true)),
    fetchEvents: vi.fn(() => Promise.resolve({ events: [], hasMore: false })),
    createEvent: vi.fn(() => Promise.resolve({ success: true, eventId: 'provider-evt-1' })),
    updateEvent: vi.fn(() => Promise.resolve(true)),
    deleteEvent: vi.fn(() => Promise.resolve(true)),
    getCalendars: vi.fn(() => Promise.resolve([]))
  }))
}))

const makeEvent = (id: string) => ({
  id,
  title: 'Test Event',
  startTime: new Date('2026-03-01T10:00:00'),
  endTime: new Date('2026-03-01T11:00:00'),
  allDay: false
})

describe('useCalendarStore — initial state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with empty events and calendars arrays', async () => {
    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    expect(store.events).toEqual([])
    expect(store.calendars).toEqual([])
    expect(store.loading).toBe(false)
  })
})

describe('useCalendarStore — fetchPersistedEvents', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('returns empty array when Firestore returns no docs', async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any)

    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    const result = await store.fetchPersistedEvents()

    expect(result).toEqual([])
    expect(store.syncedEvents).toEqual([])
  })

  it('maps Firestore docs to CalendarEvent objects in syncedEvents', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        {
          id: 'evt-1',
          data: () => ({
            title: 'Persisted Event',
            startTime: { toDate: () => new Date('2026-03-01T10:00:00') },
            endTime: { toDate: () => new Date('2026-03-01T11:00:00') },
            allDay: false,
            userId: 'u1',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() }
          })
        }
      ]
    } as any)

    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    const result = await store.fetchPersistedEvents()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('evt-1')
    expect(result[0].title).toBe('Persisted Event')
    expect(store.syncedEvents).toHaveLength(1)
  })
})

describe('useCalendarStore — fetchEvents', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sets events to empty array when no connected accounts', async () => {
    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    await store.fetchEvents()

    expect(store.events).toEqual([])
    expect(store.loading).toBe(false)
  })
})

describe('useCalendarStore — fetchCalendars', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sets calendars to empty array when no connected accounts', async () => {
    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    await store.fetchCalendars()

    expect(store.calendars).toEqual([])
    expect(store.loadingCalendars).toBe(false)
  })
})

describe('useCalendarStore — persistEvent / updatePersistedEvent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('persistEvent calls addDoc and adds event to syncedEvents', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'evt-new' } as any)

    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    const event = makeEvent('local-1') as any

    const id = await store.persistEvent(event)

    expect(addDoc).toHaveBeenCalledTimes(1)
    expect(id).toBe('evt-new')
    expect(store.syncedEvents).toHaveLength(1)
    expect(store.syncedEvents[0].id).toBe('evt-new')
  })

  it('updatePersistedEvent calls updateDoc and merges changes in syncedEvents', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ userId: 'u1', title: 'Original' })
    } as any)

    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    store.syncedEvents = [makeEvent('evt-1') as any]

    const success = await store.updatePersistedEvent('evt-1', { title: 'Updated' })

    expect(updateDoc).toHaveBeenCalledTimes(1)
    expect(success).toBe(true)
    expect(store.syncedEvents[0].title).toBe('Updated')
  })

  it('deletePersistedEvent calls deleteDoc and removes event from syncedEvents', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ userId: 'u1' })
    } as any)

    const { useCalendarStore } = await import('~/stores/calendar')
    const store = useCalendarStore()
    store.syncedEvents = [makeEvent('evt-1') as any]

    const success = await store.deletePersistedEvent('evt-1')

    expect(deleteDoc).toHaveBeenCalledTimes(1)
    expect(success).toBe(true)
    expect(store.syncedEvents).toHaveLength(0)
  })
})
