import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
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
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ user: { uid: 'user-1' } }),
}))

vi.mock('~/plugins/firebase', () => ({ db: {} }))

// Helpers
const now = new Date('2026-01-01')
function node(id: string, type: GraphNode['type'], entityId: string | null = id): GraphNode {
  return { id, userId: 'user-1', type, entityId, label: id, createdAt: now, updatedAt: now }
}
function edge(id: string, sourceId: string, targetId: string, type = 'related'): GraphEdge {
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
    store.edges = [edge('e1', 'a', 'b')]   // no edge to c
    const path = store.shortestPath('a', 'c')
    expect(path).toEqual([])
  })

  it('knowledgeFor returns linked knowledge nodes above certainty threshold', async () => {
    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    const kHigh: GraphNode = {
      ...node('k1', 'knowledge', null),
      content: 'test fact',
      subtype: 'observation',
      source: 'manual',
      certainty: 0.9,
      certaintyDate: now,
      tags: [],
    } as any
    const kLow: GraphNode = {
      ...node('k2', 'knowledge', null),
      content: 'weak guess',
      subtype: 'insight',
      source: 'ai',
      certainty: 0.3,
      certaintyDate: now,
      tags: [],
    } as any
    store.nodes = [node('p1', 'person'), kHigh, kLow]
    store.edges = [
      edge('e1', 'k1', 'p1', 'references'),
      edge('e2', 'k2', 'p1', 'references'),
    ]
    const result = store.knowledgeFor('p1', 0.6)
    expect(result.map(n => n.id)).toEqual(['k1'])
  })
})
