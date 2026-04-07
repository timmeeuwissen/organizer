// tests/unit/composables/useKnowledgeConnections.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import type { KnowledgeNode } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

const now = new Date('2026-01-01')

function makeNode(id: string, content = 'test'): KnowledgeNode {
  return {
    id, userId: 'u1', type: 'knowledge', entityId: null, label: content,
    content, subtype: 'fact', source: 'manual',
    certainty: 0.9, certaintyDate: now, tags: [],
    createdAt: now, updatedAt: now,
  }
}

function makeEdge(id: string, nodeId: string, entityType = 'person', entityId = 'p1'): KnowledgeEdge {
  return {
    id, userId: 'u1', knowledgeNodeId: nodeId,
    entityType: entityType as any, entityId,
    relationType: 'references',
    createdAt: now, updatedAt: now,
  }
}

// Mutable state that is reset before each test
let mockNodes: KnowledgeNode[] = []
let mockEdges: KnowledgeEdge[] = []
let mockCreate: ReturnType<typeof vi.fn>
let mockConnect: ReturnType<typeof vi.fn>
let mockUpdate: ReturnType<typeof vi.fn>
let mockUpdateConnection: ReturnType<typeof vi.fn>
let mockDisconnect: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

vi.mock('~/stores/knowledge', () => ({
  useKnowledgeStore: () => ({
    get nodes() { return mockNodes },
    get edges() { return mockEdges },
    connectionsForEntity: (entityType: string, entityId: string) =>
      mockEdges
        .filter(e => e.entityType === entityType && e.entityId === entityId)
        .map(e => ({ knowledge: mockNodes.find(n => n.id === e.knowledgeNodeId)!, edge: e }))
        .filter(c => c.knowledge),
    otherConnectionsForKnowledge: (nodeId: string, excludeEdgeId: string) =>
      mockEdges.filter(e => e.knowledgeNodeId === nodeId && e.id !== excludeEdgeId),
    create: (...args: any[]) => mockCreate(...args),
    connect: (...args: any[]) => mockConnect(...args),
    update: (...args: any[]) => mockUpdate(...args),
    updateConnection: (...args: any[]) => mockUpdateConnection(...args),
    disconnect: (...args: any[]) => mockDisconnect(...args),
    delete: (...args: any[]) => mockDelete(...args),
  }),
}))

describe('useKnowledgeConnections', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockNodes = []
    mockEdges = []
    mockCreate = vi.fn(async (partial: any) => makeNode('k-new', partial.content))
    mockConnect = vi.fn(async () => makeEdge('e-new', 'k-new'))
    mockUpdate = vi.fn()
    mockUpdateConnection = vi.fn()
    mockDisconnect = vi.fn()
    mockDelete = vi.fn()
  })

  it('connections returns rows for the entity', async () => {
    const k = makeNode('k1')
    const e = makeEdge('e1', 'k1')
    mockNodes.push(k)
    mockEdges.push(e)

    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const { connections } = useKnowledgeConnections('person', 'p1')
    expect(connections.value).toHaveLength(1)
    expect(connections.value[0].knowledge.id).toBe('k1')
  })

  it('connections reacts to a ref entityId', async () => {
    mockNodes.push(makeNode('k1'))
    mockEdges.push(makeEdge('e1', 'k1', 'person', 'p1'))

    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const entityId = ref('p1')
    const { connections } = useKnowledgeConnections('person', entityId)
    expect(connections.value).toHaveLength(1)
  })

  it('addKnowledge calls create then connect', async () => {
    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const { addKnowledge } = useKnowledgeConnections('person', 'p1')

    await addKnowledge(
      { content: 'new insight', subtype: 'insight', source: 'manual', certainty: 0.8, certaintyDate: now, tags: [], label: 'new insight' },
      'references'
    )
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockConnect).toHaveBeenCalledWith('k-new', 'person', 'p1', 'references', undefined)
  })

  it('disconnect delegates to store', async () => {
    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const { disconnect } = useKnowledgeConnections('person', 'p1')
    await disconnect('e1')
    expect(mockDisconnect).toHaveBeenCalledWith('e1')
  })
})
