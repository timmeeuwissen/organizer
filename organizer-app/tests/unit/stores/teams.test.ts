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

// teams.ts calls getAuth() to check for a matching Firebase session
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: { uid: 'test-user-id' }
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

describe('Teams Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchTeams', () => {
    it('results in an empty teams array when Firestore returns no docs', async () => {
      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)

      const { useTeamsStore } = await import('~/stores/teams')
      const store = useTeamsStore()

      await store.fetchTeams()

      expect(store.teams).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('maps returned docs into the teams array', async () => {
      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [
          {
            id: 'team-1',
            data: () => ({
              userId: 'test-user-id',
              name: 'Engineering',
              description: 'Eng team',
              columnLayoutMode: 'alphabetical',
              memberPersonIds: [],
              createdAt: { toDate: () => new Date('2026-01-01') },
              updatedAt: { toDate: () => new Date('2026-01-01') }
            })
          }
        ]
      } as any)

      const { useTeamsStore } = await import('~/stores/teams')
      const store = useTeamsStore()

      await store.fetchTeams()

      expect(store.teams).toHaveLength(1)
      expect(store.teams[0].id).toBe('team-1')
      expect(store.teams[0].name).toBe('Engineering')
    })
  })

  describe('createTeam', () => {
    it('calls addDoc and returns the new document id', async () => {
      const { addDoc, getDocs } = await import('firebase/firestore')
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-team-id' } as any)
      // fetchTeams is called after create; return empty list for simplicity
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)

      const { useTeamsStore } = await import('~/stores/teams')
      const store = useTeamsStore()

      const id = await store.createTeam({ name: 'Product' })

      expect(addDoc).toHaveBeenCalledOnce()
      expect(id).toBe('new-team-id')
    })

    it('includes userId and required fields in the addDoc payload', async () => {
      const { addDoc, getDocs } = await import('firebase/firestore')
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'team-xyz' } as any)
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)

      const { useTeamsStore } = await import('~/stores/teams')
      const store = useTeamsStore()

      await store.createTeam({ name: 'Design', description: 'Design team' })

      const callArg = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>
      expect(callArg.userId).toBe('test-user-id')
      expect(callArg.name).toBe('Design')
      expect(callArg.description).toBe('Design team')
      expect(callArg.memberPersonIds).toEqual([])
    })
  })

  describe('deleteTeam', () => {
    it('calls deleteDoc for the team and removes it from state', async () => {
      const { getDocs, deleteDoc } = await import('firebase/firestore')
      // First getDocs for mail meta (should return none), then fetchTeams after delete
      vi.mocked(getDocs)
        .mockResolvedValueOnce({ docs: [] } as any) // teamMailMeta query
        .mockResolvedValueOnce({ docs: [] } as any) // fetchTeams after delete

      const { useTeamsStore } = await import('~/stores/teams')
      const store = useTeamsStore()
      store.teams = [
        {
          id: 'team-1',
          userId: 'test-user-id',
          name: 'Engineering',
          columnLayoutMode: 'alphabetical',
          memberPersonIds: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await store.deleteTeam('team-1')

      expect(deleteDoc).toHaveBeenCalledOnce()
    })

    it('clears currentTeam when the deleted team was current', async () => {
      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs)
        .mockResolvedValueOnce({ docs: [] } as any)
        .mockResolvedValueOnce({ docs: [] } as any)

      const { useTeamsStore } = await import('~/stores/teams')
      const store = useTeamsStore()
      const team = {
        id: 'team-1',
        userId: 'test-user-id',
        name: 'Engineering',
        columnLayoutMode: 'alphabetical' as const,
        memberPersonIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      store.teams = [team]
      store.currentTeam = team

      await store.deleteTeam('team-1')

      expect(store.currentTeam).toBeNull()
    })
  })
})
