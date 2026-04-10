import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { getDocs, addDoc } from 'firebase/firestore'
import type { GraphNode, GraphEdge } from '~/types/models/network'

// Mock Firebase — the store imports these
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date('2026-01-01')),
  getFirestore: vi.fn(() => ({}))
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } })
}))

// Helpers
const now = new Date('2026-01-01')
function node (id: string, type: GraphNode['type'], entityId: string | null = id): GraphNode {
  return { id, userId: 'user-1', type, entityId, label: id, createdAt: now, updatedAt: now }
}
function edge (id: string, sourceId: string, targetId: string, type = 'related'): GraphEdge {
  return { id, userId: 'user-1', sourceId, targetId, type, createdAt: now, updatedAt: now }
}

describe('useNetworkStore — getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('getNode returns node by id', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    const n = node('a', 'person')
    store.nodes = [n]
    expect(store.getNode('a')).toEqual(n)
    expect(store.getNode('z')).toBeUndefined()
  })

  it('getByEntity returns node by type and entityId', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    const n = node('node-1', 'project', 'proj-123')
    store.nodes = [n]
    expect(store.getByEntity('project', 'proj-123')).toEqual(n)
    expect(store.getByEntity('project', 'proj-999')).toBeUndefined()
  })

  it('getNeighbours returns direct neighbours at depth 1', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    store.nodes = [node('a', 'person'), node('b', 'project'), node('c', 'task')]
    store.edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]
    const neighbours = store.getNeighbours('a', 1)
    expect(neighbours.map(n => n.id)).toEqual(['b'])
  })

  it('getNeighbours returns 2-hop neighbours at depth 2', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    store.nodes = [node('a', 'person'), node('b', 'project'), node('c', 'task')]
    store.edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]
    const neighbours = store.getNeighbours('a', 2)
    expect(neighbours.map(n => n.id).sort()).toEqual(['b', 'c'])
  })

  it('getNeighbours handles cycles without infinite loop', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    store.nodes = [node('a', 'person'), node('b', 'project'), node('c', 'task')]
    store.edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a')]
    expect(() => store.getNeighbours('a', 3)).not.toThrow()
  })

  it('shortestPath finds direct connection', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    store.nodes = [node('a', 'person'), node('b', 'project')]
    store.edges = [edge('e1', 'a', 'b')]
    const path = store.shortestPath('a', 'b')
    expect(path.map(n => n.id)).toEqual(['a', 'b'])
  })

  it('shortestPath finds 2-hop path', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    store.nodes = [node('a', 'person'), node('b', 'project'), node('c', 'task')]
    store.edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]
    const path = store.shortestPath('a', 'c')
    expect(path.map(n => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('shortestPath returns empty array when no path exists', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    store.nodes = [node('a', 'person'), node('b', 'project'), node('c', 'task')]
    store.edges = [edge('e1', 'a', 'b')] // no edge to c
    const path = store.shortestPath('a', 'c')
    expect(path).toEqual([])
  })

  it('updateEdge merges partial into local state', async () => {
    const { updateDoc } = await import('firebase/firestore')
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    store.edges = [edge('e1', 'a', 'b', 'related')]
    await store.updateEdge('e1', { type: 'member', label: 'test' })
    expect(store.edges[0].type).toBe('member')
    expect(store.edges[0].label).toBe('test')
    expect(updateDoc).toHaveBeenCalledTimes(1)
  })
})

describe('useNetworkStore — syncFromStores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('creates person nodes from people store', async () => {
    vi.mock('~/stores/people', () => ({
      usePeopleStore: () => ({
        people: [{ id: 'p1', firstName: 'Alice', lastName: 'Smith', relatedProjects: [], relatedTasks: [] }],
        fetchPeople: vi.fn().mockResolvedValue(undefined),
      })
    }))
    vi.mock('~/stores/projects', () => ({ useProjectsStore: () => ({ projects: [], fetchProjects: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/tasks', () => ({ useTasksStore: () => ({ tasks: [], fetchTasks: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/behaviors', () => ({ useBehaviorsStore: () => ({ behaviors: [], fetchBehaviors: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/meetings', () => ({ useMeetingsStore: () => ({ meetings: [], fetchMeetings: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/teams', () => ({ useTeamsStore: () => ({ teams: [], fetchTeams: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/coaching', () => ({ useCoachingStore: () => ({ records: [], fetchRecords: vi.fn().mockResolvedValue(undefined) }) }))

    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any)
    vi.mocked(addDoc).mockResolvedValue({ id: 'node-abc' } as any)

    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    await store.syncFromStores()

    expect(addDoc).toHaveBeenCalled()
    const calls = vi.mocked(addDoc).mock.calls
    const nodeCall = calls.find(c => (c[1] as any)?.type === 'person')
    expect(nodeCall).toBeDefined()
    expect((nodeCall![1] as any).entityId).toBe('p1')
    expect((nodeCall![1] as any).label).toBe('Alice Smith')
  })

  it('is idempotent — does not duplicate existing nodes', async () => {
    vi.mock('~/stores/people', () => ({
      usePeopleStore: () => ({
        people: [{ id: 'p1', firstName: 'Alice', lastName: 'Smith', relatedProjects: [], relatedTasks: [] }],
        fetchPeople: vi.fn().mockResolvedValue(undefined),
      })
    }))
    vi.mock('~/stores/projects', () => ({ useProjectsStore: () => ({ projects: [], fetchProjects: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/tasks', () => ({ useTasksStore: () => ({ tasks: [], fetchTasks: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/behaviors', () => ({ useBehaviorsStore: () => ({ behaviors: [], fetchBehaviors: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/meetings', () => ({ useMeetingsStore: () => ({ meetings: [], fetchMeetings: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/teams', () => ({ useTeamsStore: () => ({ teams: [], fetchTeams: vi.fn().mockResolvedValue(undefined) }) }))
    vi.mock('~/stores/coaching', () => ({ useCoachingStore: () => ({ records: [], fetchRecords: vi.fn().mockResolvedValue(undefined) }) }))

    vi.mocked(getDocs).mockResolvedValue({
      docs: [{
        id: 'existing-node',
        data: () => ({ type: 'person', entityId: 'p1', label: 'Alice', userId: 'user-1' })
      }]
    } as any)

    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    await store.syncFromStores()

    const personNodeAdds = vi.mocked(addDoc).mock.calls.filter(
      c => (c[1] as any)?.type === 'person' && (c[1] as any)?.entityId === 'p1'
    )
    expect(personNodeAdds).toHaveLength(0)
  })
})
