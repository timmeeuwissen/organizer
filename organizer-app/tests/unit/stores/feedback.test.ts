import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-feedback-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date('2026-01-01')),
  getFirestore: vi.fn(() => ({})),
  Timestamp: { fromDate: (d: Date) => d, now: () => new Date() }
}))

vi.mock('uuid', () => ({ v4: () => 'mock-uuid' }))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }))
}))

describe('useFeedbackStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with empty feedbacks', async () => {
    const { useFeedbackStore } = await import('~/stores/feedback')
    const store = useFeedbackStore()
    expect(store.feedbacks).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchFeedbacks sets loading state', async () => {
    const { getDocs } = await import('firebase/firestore')
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)

    const { useFeedbackStore } = await import('~/stores/feedback')
    const store = useFeedbackStore()
    await store.fetchFeedbacks('u1')
    expect(store.loading).toBe(false)
  })

  it('addFeedback calls addDoc with feedback data', async () => {
    const { addDoc } = await import('firebase/firestore')
    const { useFeedbackStore } = await import('~/stores/feedback')
    const store = useFeedbackStore()

    await store.addFeedback({
      type: 'bug',
      title: 'Test Bug',
      description: 'Something broke',
      priority: 'medium',
      module: 'tasks',
      userId: 'u1'
    })

    expect(addDoc).toHaveBeenCalled()
    const call = vi.mocked(addDoc).mock.calls[0]
    expect((call[1] as any).title).toBe('Test Bug')
    expect((call[1] as any).type).toBe('bug')
  })

  it('clearError resets error state', async () => {
    const { useFeedbackStore } = await import('~/stores/feedback')
    const store = useFeedbackStore()
    store.error = 'some error'
    store.clearError()
    expect(store.error).toBeNull()
  })
})
