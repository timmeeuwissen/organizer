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
  setDoc: vi.fn(() => Promise.resolve()),
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

vi.mock('~/stores/people', () => ({
  usePeopleStore: vi.fn(() => ({
    people: [],
    fetchPeople: vi.fn()
  }))
}))

describe('useCoachingStore — fetchRecords', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with an empty records array', async () => {
    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    expect(store.records).toEqual([])
  })

  it('populates records from Firestore docs', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        {
          id: 'rec-1',
          data: () => ({
            userId: 'u1',
            personId: 'p1',
            strengths: [],
            weaknesses: [],
            goals: [],
            timeline: [],
            relatedTasks: [],
            icon: 'mdi-account-heart',
            color: 'primary',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01')
          })
        }
      ]
    } as any)

    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    await store.fetchRecords()

    expect(store.records).toHaveLength(1)
    expect(store.records[0].id).toBe('rec-1')
    expect(store.records[0].personId).toBe('p1')
    expect(store.loading).toBe(false)
  })

  it('sets loading to false after fetch', async () => {
    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    await store.fetchRecords()
    expect(store.loading).toBe(false)
  })
})

describe('useCoachingStore — createRecord', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls addDoc and adds the record to local state', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'rec-new' } as any)

    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    const created = await store.createRecord({ personId: 'p2' })

    expect(addDoc).toHaveBeenCalledTimes(1)
    expect(created?.id).toBe('rec-new')
    expect(store.records).toHaveLength(1)
    expect(store.records[0].personId).toBe('p2')
  })

  it('sets userId from auth store on the new record', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'rec-2' } as any)

    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    await store.createRecord({ personId: 'p3' })

    const callArg = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>
    expect(callArg.userId).toBe('u1')
  })
})

describe('useCoachingStore — updateRecord', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls updateDoc and merges updates into local state', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ userId: 'u1', personId: 'p1' })
    } as any)

    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    store.records = [
      {
        id: 'rec-1',
        userId: 'u1',
        personId: 'p1',
        strengths: [],
        weaknesses: [],
        goals: [],
        timeline: [],
        relatedTasks: [],
        icon: 'mdi-account-heart',
        color: 'primary',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    ]

    await store.updateRecord('rec-1', { personId: 'p-updated' })

    expect(updateDoc).toHaveBeenCalledTimes(1)
    expect(store.records[0].personId).toBe('p-updated')
  })
})

describe('useCoachingStore — deleteRecord', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls deleteDoc and removes the record from local state', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ userId: 'u1' })
    } as any)

    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    store.records = [
      {
        id: 'rec-1',
        userId: 'u1',
        personId: 'p1',
        strengths: [],
        weaknesses: [],
        goals: [],
        timeline: [],
        relatedTasks: [],
        icon: 'mdi-account-heart',
        color: 'primary',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    ]

    await store.deleteRecord('rec-1')

    expect(deleteDoc).toHaveBeenCalledTimes(1)
    expect(store.records).toHaveLength(0)
  })

  it('clears currentRecord when deleting the active record', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ userId: 'u1' })
    } as any)

    const { useCoachingStore } = await import('~/stores/coaching')
    const store = useCoachingStore()
    const record = {
      id: 'rec-1',
      userId: 'u1',
      personId: 'p1',
      strengths: [],
      weaknesses: [],
      goals: [],
      timeline: [],
      relatedTasks: [],
      icon: 'mdi-account-heart',
      color: 'primary',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any
    store.records = [record]
    store.currentRecord = record

    await store.deleteRecord('rec-1')

    expect(store.currentRecord).toBeNull()
  })
})
