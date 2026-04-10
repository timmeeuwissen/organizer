// tests/unit/stores/knowledge.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { addDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore'
import type { KnowledgeNode } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  doc: vi.fn(() => ({})),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date('2026-01-01')),
  getFirestore: vi.fn(() => ({}))
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } })
}))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: () => ({ error: vi.fn() })
}))

const now = new Date('2026-01-01')

function makeNode (id: string): KnowledgeNode {
  return {
    id,
    userId: 'user-1',
    type: 'knowledge',
    entityId: null,
    label: 'test',
    content: 'test content',
    subtype: 'fact',
    source: 'manual',
    certainty: 0.8,
    certaintyDate: now,
    tags: [],
    createdAt: now,
    updatedAt: now
  }
}

function makeEdge (id: string, knowledgeNodeId: string): KnowledgeEdge {
  return {
    id,
    userId: 'user-1',
    knowledgeNodeId,
    entityType: 'person',
    entityId: 'p1',
    relationType: 'references',
    createdAt: now,
    updatedAt: now
  }
}

describe('useKnowledgeStore — getters', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('connectionsForEntity returns nodes connected to the entity', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    const k = makeNode('k1')
    const e = makeEdge('e1', 'k1')
    store.nodes = [k]
    store.edges = [e]
    const result = store.connectionsForEntity('person', 'p1')
    expect(result).toHaveLength(1)
    expect(result[0].knowledge.id).toBe('k1')
    expect(result[0].edge.id).toBe('e1')
  })

  it('connectionsForEntity ignores edges for other entities', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    store.nodes = [makeNode('k1')]
    store.edges = [makeEdge('e1', 'k1')] // edge connects to person p1
    const result = store.connectionsForEntity('project', 'proj-1')
    expect(result).toHaveLength(0)
  })

  it('otherConnectionsForKnowledge excludes the specified edge', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    const e1 = makeEdge('e1', 'k1')
    const e2: KnowledgeEdge = { ...makeEdge('e2', 'k1'), entityType: 'project', entityId: 'proj-1' }
    store.edges = [e1, e2]
    const others = store.otherConnectionsForKnowledge('k1', 'e1')
    expect(others).toHaveLength(1)
    expect(others[0].id).toBe('e2')
  })
})

describe('useKnowledgeStore — actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('create adds node to local state', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'k-new' } as any)
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    const node = await store.create({
      content: 'test fact',
      subtype: 'fact',
      source: 'manual',
      certainty: 0.9,
      certaintyDate: now,
      tags: [],
      label: 'test fact'
    })
    expect(node?.id).toBe('k-new')
    expect(store.nodes).toHaveLength(1)
    expect(store.nodes[0].content).toBe('test fact')
  })

  it('connect adds edge to local state', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: 'e-new' } as any)
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    const edge = await store.connect('k1', 'person', 'p1', 'references', 'knows about')
    expect(edge?.id).toBe('e-new')
    expect(store.edges).toHaveLength(1)
    expect(store.edges[0].label).toBe('knows about')
  })

  it('delete removes node and its edges from local state', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: 'e1', data: () => ({}) }]
    } as any)
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    store.nodes = [makeNode('k1')]
    store.edges = [makeEdge('e1', 'k1')]
    await store.delete('k1')
    expect(store.nodes).toHaveLength(0)
    expect(store.edges).toHaveLength(0)
    expect(deleteDoc).toHaveBeenCalledTimes(2) // edge + node
  })

  it('disconnect removes edge from local state', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    store.edges = [makeEdge('e1', 'k1')]
    await store.disconnect('e1')
    expect(store.edges).toHaveLength(0)
    expect(deleteDoc).toHaveBeenCalledTimes(1)
  })

  it('updateConnection merges relationType into local state', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore()
    store.edges = [makeEdge('e1', 'k1')]
    await store.updateConnection('e1', 'related', 'new label')
    expect(store.edges[0].relationType).toBe('related')
    expect(store.edges[0].label).toBe('new label')
    expect(updateDoc).toHaveBeenCalledTimes(1)
  })
})
