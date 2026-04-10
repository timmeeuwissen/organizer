import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'test-user-id' } }))
}))

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

vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }))
}))

describe('Meetings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchMeetings', () => {
    it('results in an empty meetings array when Firestore returns no docs', async () => {
      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)

      const { useMeetingsStore } = await import('~/stores/meetings')
      const store = useMeetingsStore()

      await store.fetchMeetings()

      expect(store.meetings).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('maps returned docs into the meetings array', async () => {
      const { getDocs } = await import('firebase/firestore')
      const startDate = new Date('2026-06-01T10:00:00Z')
      const endDate = new Date('2026-06-01T11:00:00Z')

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [
          {
            id: 'meeting-1',
            data: () => ({
              userId: 'test-user-id',
              title: 'Sprint Review',
              participants: [],
              tasks: [],
              startTime: { toDate: () => startDate },
              endTime: { toDate: () => endDate },
              createdAt: { toDate: () => new Date('2026-01-01') },
              updatedAt: { toDate: () => new Date('2026-01-01') }
            })
          }
        ]
      } as any)

      const { useMeetingsStore } = await import('~/stores/meetings')
      const store = useMeetingsStore()

      await store.fetchMeetings()

      expect(store.meetings).toHaveLength(1)
      expect(store.meetings[0].id).toBe('meeting-1')
      expect(store.meetings[0].title).toBe('Sprint Review')
      expect(store.meetings[0].startTime).toEqual(startDate)
    })
  })

  describe('createMeeting', () => {
    it('calls addDoc and returns the new document id', async () => {
      const { addDoc } = await import('firebase/firestore')
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-meeting-id' } as any)

      const { useMeetingsStore } = await import('~/stores/meetings')
      const store = useMeetingsStore()

      const id = await store.createMeeting({ title: 'Kickoff' })

      expect(addDoc).toHaveBeenCalledOnce()
      expect(id).toBe('new-meeting-id')
    })

    it('pushes the new meeting into state and sets currentMeeting', async () => {
      const { addDoc } = await import('firebase/firestore')
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'meeting-abc' } as any)

      const { useMeetingsStore } = await import('~/stores/meetings')
      const store = useMeetingsStore()

      await store.createMeeting({ title: 'All Hands' })

      expect(store.meetings).toHaveLength(1)
      expect(store.meetings[0].id).toBe('meeting-abc')
      expect(store.currentMeeting?.id).toBe('meeting-abc')
    })

    it('sets userId from auth store on the created document', async () => {
      const { addDoc } = await import('firebase/firestore')
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'meeting-xyz' } as any)

      const { useMeetingsStore } = await import('~/stores/meetings')
      const store = useMeetingsStore()

      await store.createMeeting({ title: 'Planning' })

      const callArg = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>
      expect(callArg.userId).toBe('test-user-id')
    })
  })

  describe('updateMeeting', () => {
    it('calls updateDoc and updates the meeting in state', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'test-user-id', title: 'Old Title' })
      } as any)

      const { useMeetingsStore } = await import('~/stores/meetings')
      const store = useMeetingsStore()
      store.meetings = [
        {
          id: 'meeting-1',
          userId: 'test-user-id',
          title: 'Old Title',
          participants: [],
          tasks: [],
          startTime: new Date(),
          endTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        } as any
      ]

      await store.updateMeeting('meeting-1', { title: 'New Title' })

      expect(updateDoc).toHaveBeenCalledOnce()
      expect(store.meetings[0].title).toBe('New Title')
    })

    it('updates currentMeeting if the updated meeting is current', async () => {
      const { getDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'test-user-id', title: 'Old Title' })
      } as any)

      const { useMeetingsStore } = await import('~/stores/meetings')
      const store = useMeetingsStore()
      const meeting = {
        id: 'meeting-1',
        userId: 'test-user-id',
        title: 'Old Title',
        participants: [],
        tasks: [],
        startTime: new Date(),
        endTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
      store.meetings = [meeting]
      store.currentMeeting = meeting

      await store.updateMeeting('meeting-1', { title: 'Updated Title' })

      expect(store.currentMeeting?.title).toBe('Updated Title')
    })
  })
})
