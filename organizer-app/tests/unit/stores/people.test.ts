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
  setDoc: vi.fn(() => Promise.resolve()),
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

vi.mock('~/utils/api/contactProviders', () => ({
  createContactsProvider: vi.fn()
}))

describe('People Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchPeople', () => {
    it('results in an empty people array when Firestore returns no docs', async () => {
      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)

      const { usePeopleStore } = await import('~/stores/people')
      const store = usePeopleStore()

      await store.fetchPeople()

      expect(store.people).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('maps returned docs into the people array', async () => {
      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [
          {
            id: 'person-1',
            data: () => ({
              userId: 'test-user-id',
              firstName: 'Alice',
              lastName: 'Smith',
              lastContacted: null,
              createdAt: { toDate: () => new Date('2026-01-01') },
              updatedAt: { toDate: () => new Date('2026-01-01') }
            })
          }
        ]
      } as any)

      const { usePeopleStore } = await import('~/stores/people')
      const store = usePeopleStore()

      await store.fetchPeople()

      expect(store.people).toHaveLength(1)
      expect(store.people[0].id).toBe('person-1')
      expect(store.people[0].firstName).toBe('Alice')
    })
  })

  describe('createPerson', () => {
    it('calls addDoc and pushes the new person into state', async () => {
      const { addDoc } = await import('firebase/firestore')
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-person-id' } as any)

      const { usePeopleStore } = await import('~/stores/people')
      const store = usePeopleStore()

      const result = await store.createPerson({ firstName: 'Bob', lastName: 'Jones' })

      expect(addDoc).toHaveBeenCalledOnce()
      expect(result).toBe('new-person-id')
      expect(store.people).toHaveLength(1)
      expect(store.people[0].id).toBe('new-person-id')
      expect(store.people[0].firstName).toBe('Bob')
    })

    it('sets userId from auth store on the created document', async () => {
      const { addDoc } = await import('firebase/firestore')
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'person-abc' } as any)

      const { usePeopleStore } = await import('~/stores/people')
      const store = usePeopleStore()

      await store.createPerson({ firstName: 'Carol' })

      const callArg = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>
      expect(callArg.userId).toBe('test-user-id')
    })
  })

  describe('updatePerson', () => {
    it('calls updateDoc with the correct updates', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'test-user-id', firstName: 'Alice' })
      } as any)

      const { usePeopleStore } = await import('~/stores/people')
      const store = usePeopleStore()
      store.people = [
        {
          id: 'person-1',
          userId: 'test-user-id',
          firstName: 'Alice',
          lastName: 'Smith',
          createdAt: new Date(),
          updatedAt: new Date(),
          relatedMeetings: [],
          relatedProjects: [],
          relatedTasks: []
        } as any
      ]

      await store.updatePerson('person-1', { firstName: 'Alicia' })

      expect(updateDoc).toHaveBeenCalledOnce()
      expect(store.people[0].firstName).toBe('Alicia')
    })
  })

  describe('deletePerson', () => {
    it('calls deleteDoc and removes the person from state', async () => {
      const { getDoc, deleteDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'test-user-id' })
      } as any)

      const { usePeopleStore } = await import('~/stores/people')
      const store = usePeopleStore()
      store.people = [
        {
          id: 'person-1',
          userId: 'test-user-id',
          firstName: 'Alice',
          lastName: 'Smith',
          createdAt: new Date(),
          updatedAt: new Date(),
          relatedMeetings: [],
          relatedProjects: [],
          relatedTasks: []
        } as any
      ]

      await store.deletePerson('person-1')

      expect(deleteDoc).toHaveBeenCalledOnce()
      expect(store.people).toHaveLength(0)
    })

    it('clears currentPerson when the deleted person was current', async () => {
      const { getDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'test-user-id' })
      } as any)

      const { usePeopleStore } = await import('~/stores/people')
      const store = usePeopleStore()
      const person = {
        id: 'person-1',
        userId: 'test-user-id',
        firstName: 'Alice',
        lastName: 'Smith',
        createdAt: new Date(),
        updatedAt: new Date(),
        relatedMeetings: [],
        relatedProjects: [],
        relatedTasks: []
      } as any
      store.people = [person]
      store.currentPerson = person

      await store.deletePerson('person-1')

      expect(store.currentPerson).toBeNull()
    })
  })
})
