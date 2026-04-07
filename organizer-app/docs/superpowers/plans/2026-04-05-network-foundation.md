# Network Module Foundation: Graph Store + 3D Visualization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing vis-network 2D graph with a 3d-force-graph visualization backed by a Pinia store that derives all entity relationships from existing module stores.

**Architecture:** A new `stores/network.ts` Pinia store holds GraphNode + GraphEdge records in Firestore. On first run, `syncFromStores()` bootstraps edges from existing module store data (idempotent). The network page is rewritten around five focused Vue components. This plan covers the foundation and visualization only — knowledge nodes (Plan 2), AI integration (Plan 3), and advanced features (Plan 4) build on this.

**Tech Stack:** `3d-force-graph` (npm), Pinia, Firebase Firestore, Vue 3, Vuetify 3, TypeScript, Pug templates, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `types/models/network.ts` | GraphNode, GraphEdge, KnowledgeNode interfaces + type guards |
| Create | `config/network.ts` | Node colors, sizes, edge label map — never hardcode in components |
| Create | `stores/network.ts` | Graph state, BFS getters, syncFromStores, CRUD actions |
| Create | `tests/unit/stores/network.test.ts` | Unit tests for store getters and actions |
| Create | `components/network/NetworkGraph3D.vue` | 3d-force-graph canvas wrapper; emits events only |
| Create | `components/network/NetworkSidebar.vue` | Left panel: type toggles, depth slider, pin list, path finder, knowledge filter, time range |
| Create | `components/network/NetworkNodeDetail.vue` | Right panel: selected node summary |
| Rewrite | `pages/network/index.vue` | Page shell: loads stores, wires components, no business logic |
| Modify | `locales/en.ts` | Add `network.*` and `knowledge.*` i18n keys |
| Modify | `locales/nl.ts` | Dutch translations for same keys |

---

### Task 1: TypeScript interfaces and config constants

**Files:**
- Create: `types/models/network.ts`
- Create: `config/network.ts`

- [ ] **Step 1: Create the type definitions**

Create `organizer-app/types/models/network.ts`:

```typescript
export type NodeType =
  | 'person' | 'project' | 'task' | 'behavior'
  | 'meeting' | 'team' | 'coaching' | 'knowledge'

export type EdgeType =
  | 'member' | 'assignee' | 'contains' | 'participant'
  | 'references' | 'related' | 'subtask' | 'stakeholder'
  | 'action-plan' | string

export type KnowledgeSubtype =
  | 'observation' | 'concept' | 'reason' | 'fact' | 'insight' | 'pattern'

export type KnowledgeSource = 'manual' | 'ai' | 'email' | 'note'

export interface GraphNode {
  id: string
  userId: string
  type: NodeType
  entityId: string | null   // ID in source store; null for knowledge nodes
  label: string
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeNode extends GraphNode {
  type: 'knowledge'
  entityId: null
  content: string
  subtype: KnowledgeSubtype
  source: KnowledgeSource
  sourceRef?: string
  certainty: number          // 0.0–1.0
  certaintyDate: Date
  tags: string[]
}

export interface GraphEdge {
  id: string
  userId: string
  sourceId: string
  targetId: string
  type: EdgeType
  label?: string
  createdAt: Date
  updatedAt: Date
}

export function isKnowledgeNode(node: GraphNode): node is KnowledgeNode {
  return node.type === 'knowledge'
}
```

- [ ] **Step 2: Create the config constants**

Create `organizer-app/config/network.ts`:

```typescript
import type { NodeType } from '~/types/models/network'

export const NODE_COLORS: Record<NodeType, string> = {
  person:    '#89b4fa',
  project:   '#a6e3a1',
  task:      '#f38ba8',
  behavior:  '#fab387',
  meeting:   '#cba6f7',
  team:      '#f9e2af',
  coaching:  '#94e2d5',
  knowledge: '#eba0ac',
}

// Base size; actual rendered size also scales with node degree
export const NODE_BASE_SIZES: Record<NodeType, number> = {
  person:    6,
  project:   8,
  task:      4,
  behavior:  5,
  meeting:   5,
  team:      7,
  coaching:  5,
  knowledge: 5,
}

export const GRAPH_DEFAULTS = {
  depth: 2,
  minCertainty: 0.6,
  maxContextTokens: 800,
  aiInsightCertainty: 0.7,
} as const
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app
git add types/models/network.ts config/network.ts
git commit -m "feat(network): add GraphNode/GraphEdge/KnowledgeNode types and config constants"
```

---

### Task 2: Network store — state and BFS getters

**Files:**
- Create: `stores/network.ts` (state + getters only, no actions yet)
- Create: `tests/unit/stores/network.test.ts`

- [ ] **Step 1: Write failing tests for getters**

Create `organizer-app/tests/unit/stores/network.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd organizer-app
npm run test -- tests/unit/stores/network.test.ts
```

Expected: multiple FAIL errors — `stores/network` module not found.

- [ ] **Step 3: Create the store with state and getters**

Create `organizer-app/stores/network.ts`:

```typescript
import { defineStore } from 'pinia'
import type { GraphNode, GraphEdge, KnowledgeNode, NodeType } from '~/types/models/network'
import { isKnowledgeNode } from '~/types/models/network'

export const useNetworkStore = defineStore('network', {
  persist: true,

  state: () => ({
    nodes: [] as GraphNode[],
    edges: [] as GraphEdge[],
    loading: false,
    bootstrapped: false,
  }),

  getters: {
    getNode: (state) => (id: string) =>
      state.nodes.find(n => n.id === id),

    getByEntity: (state) => (type: NodeType, entityId: string) =>
      state.nodes.find(n => n.type === type && n.entityId === entityId),

    getNeighbours: (state) => (nodeId: string, depth = 2): GraphNode[] => {
      if (depth === 0) return []
      const visited = new Set<string>([nodeId])
      const queue: Array<{ id: string; remaining: number }> = [{ id: nodeId, remaining: depth }]
      const result: GraphNode[] = []

      while (queue.length > 0) {
        const { id, remaining } = queue.shift()!
        const adjacent = state.edges.filter(e => e.sourceId === id || e.targetId === id)
        for (const edge of adjacent) {
          const neighbourId = edge.sourceId === id ? edge.targetId : edge.sourceId
          if (!visited.has(neighbourId)) {
            visited.add(neighbourId)
            const node = state.nodes.find(n => n.id === neighbourId)
            if (node) {
              result.push(node)
              if (remaining > 1) queue.push({ id: neighbourId, remaining: remaining - 1 })
            }
          }
        }
      }
      return result
    },

    shortestPath: (state) => (fromId: string, toId: string): GraphNode[] => {
      if (fromId === toId) return []
      const visited = new Set<string>([fromId])
      const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }]

      while (queue.length > 0) {
        const { id, path } = queue.shift()!
        const adjacent = state.edges.filter(e => e.sourceId === id || e.targetId === id)
        for (const edge of adjacent) {
          const neighbourId = edge.sourceId === id ? edge.targetId : edge.sourceId
          if (neighbourId === toId) {
            const fullPath = [...path, toId]
            return fullPath.map(nId => state.nodes.find(n => n.id === nId)!).filter(Boolean)
          }
          if (!visited.has(neighbourId)) {
            visited.add(neighbourId)
            queue.push({ id: neighbourId, path: [...path, neighbourId] })
          }
        }
      }
      return []
    },

    knowledgeFor: (state) => (nodeId: string, minCertainty = 0.6): KnowledgeNode[] => {
      const linkedEdges = state.edges.filter(
        e => (e.sourceId === nodeId || e.targetId === nodeId) && e.type === 'references'
      )
      return linkedEdges
        .map(e => {
          const otherId = e.sourceId === nodeId ? e.targetId : e.sourceId
          return state.nodes.find(n => n.id === otherId)
        })
        .filter((n): n is GraphNode => !!n && isKnowledgeNode(n))
        .filter(n => (n as KnowledgeNode).certainty >= minCertainty) as KnowledgeNode[]
    },

    nodeDegree: (state) => (nodeId: string): number =>
      state.edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId).length,
  },

  actions: {
    // Placeholder actions — implemented in Tasks 3 and 4
    async load() {},
    async syncFromStores() {},
  },
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd organizer-app
npm run test -- tests/unit/stores/network.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add stores/network.ts tests/unit/stores/network.test.ts
git commit -m "feat(network): add network store with BFS getters and unit tests"
```

---

### Task 3: Network store — `load()` and `syncFromStores()`

**Files:**
- Modify: `stores/network.ts` — implement `load()` and `syncFromStores()`
- Modify: `tests/unit/stores/network.test.ts` — add action tests

- [ ] **Step 1: Add action tests**

Append to `organizer-app/tests/unit/stores/network.test.ts`:

```typescript
import { getDocs, addDoc, collection, query, where } from 'firebase/firestore'

describe('useNetworkStore — syncFromStores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('creates person nodes from people store', async () => {
    vi.mock('~/stores/people', () => ({
      usePeopleStore: () => ({
        people: [{ id: 'p1', name: 'Alice', relatedProjects: [], relatedTasks: [] }],
      }),
    }))
    vi.mock('~/stores/projects', () => ({ useProjectsStore: () => ({ projects: [] }) }))
    vi.mock('~/stores/tasks', () => ({ useTasksStore: () => ({ tasks: [] }) }))
    vi.mock('~/stores/behaviors', () => ({ useBehaviorsStore: () => ({ behaviors: [] }) }))
    vi.mock('~/stores/meetings', () => ({ useMeetingsStore: () => ({ meetings: [] }) }))
    vi.mock('~/stores/teams', () => ({ useTeamsStore: () => ({ teams: [] }) }))
    vi.mock('~/stores/coaching', () => ({ useCoachingStore: () => ({ records: [] }) }))

    // getDocs returns empty (no existing nodes)
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any)
    // addDoc returns a fake ID
    vi.mocked(addDoc).mockResolvedValue({ id: 'node-abc' } as any)

    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    await store.syncFromStores()

    // addDoc called at least once for Alice's node
    expect(addDoc).toHaveBeenCalled()
    const calls = vi.mocked(addDoc).mock.calls
    const nodeCall = calls.find(c => (c[1] as any)?.type === 'person')
    expect(nodeCall).toBeDefined()
    expect((nodeCall![1] as any).entityId).toBe('p1')
    expect((nodeCall![1] as any).label).toBe('Alice')
  })

  it('is idempotent — does not duplicate existing nodes', async () => {
    vi.mock('~/stores/people', () => ({
      usePeopleStore: () => ({
        people: [{ id: 'p1', name: 'Alice', relatedProjects: [], relatedTasks: [] }],
      }),
    }))
    vi.mock('~/stores/projects', () => ({ useProjectsStore: () => ({ projects: [] }) }))
    vi.mock('~/stores/tasks', () => ({ useTasksStore: () => ({ tasks: [] }) }))
    vi.mock('~/stores/behaviors', () => ({ useBehaviorsStore: () => ({ behaviors: [] }) }))
    vi.mock('~/stores/meetings', () => ({ useMeetingsStore: () => ({ meetings: [] }) }))
    vi.mock('~/stores/teams', () => ({ useTeamsStore: () => ({ teams: [] }) }))
    vi.mock('~/stores/coaching', () => ({ useCoachingStore: () => ({ records: [] }) }))

    // getDocs returns the node already existing
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{
        id: 'existing-node',
        data: () => ({ type: 'person', entityId: 'p1', label: 'Alice', userId: 'user-1' }),
      }],
    } as any)

    const { useNetworkStore } = await import('~/stores/network')
    const store = useNetworkStore()
    await store.syncFromStores()

    // addDoc should NOT be called for Alice since she already has a node
    const personNodeAdds = vi.mocked(addDoc).mock.calls.filter(
      c => (c[1] as any)?.type === 'person' && (c[1] as any)?.entityId === 'p1'
    )
    expect(personNodeAdds).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd organizer-app
npm run test -- tests/unit/stores/network.test.ts --grep "syncFromStores"
```

Expected: FAIL — `syncFromStores` is a no-op.

- [ ] **Step 3: Implement `load()` and `syncFromStores()`**

Replace the `actions` block in `organizer-app/stores/network.ts`:

```typescript
actions: {
  async load() {
    const { collection, query, where, getDocs } = await import('firebase/firestore')
    const { db } = await import('~/plugins/firebase')
    const authStore = useAuthStore()
    const userId = authStore.user?.uid
    if (!userId) return

    this.loading = true
    try {
      const [nodeSnap, edgeSnap] = await Promise.all([
        getDocs(query(collection(db, 'graphNodes'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'graphEdges'), where('userId', '==', userId))),
      ])
      this.nodes = nodeSnap.docs.map(d => ({
        ...(d.data() as Omit<GraphNode, 'id'>),
        id: d.id,
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
      }))
      this.edges = edgeSnap.docs.map(d => ({
        ...(d.data() as Omit<GraphEdge, 'id'>),
        id: d.id,
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
      }))
    } finally {
      this.loading = false
    }
  },

  async syncFromStores() {
    const { collection, query, where, getDocs, addDoc, serverTimestamp } =
      await import('firebase/firestore')
    const { db } = await import('~/plugins/firebase')
    const authStore = useAuthStore()
    const userId = authStore.user?.uid
    if (!userId) return

    // Lazy imports to avoid circular deps
    const { usePeopleStore } = await import('~/stores/people')
    const { useProjectsStore } = await import('~/stores/projects')
    const { useTasksStore } = await import('~/stores/tasks')
    const { useBehaviorsStore } = await import('~/stores/behaviors')
    const { useMeetingsStore } = await import('~/stores/meetings')
    const { useTeamsStore } = await import('~/stores/teams')
    const { useCoachingStore } = await import('~/stores/coaching')

    const peopleStore = usePeopleStore()
    const projectsStore = useProjectsStore()
    const tasksStore = useTasksStore()
    const behaviorsStore = useBehaviorsStore()
    const meetingsStore = useMeetingsStore()
    const teamsStore = useTeamsStore()
    const coachingStore = useCoachingStore()

    // Fetch existing nodes to avoid duplicates (idempotent)
    const existingSnap = await getDocs(
      query(collection(db, 'graphNodes'), where('userId', '==', userId))
    )
    const existingByKey = new Map<string, string>() // "type:entityId" → graphNode id
    for (const d of existingSnap.docs) {
      const data = d.data()
      if (data.entityId) existingByKey.set(`${data.type}:${data.entityId}`, d.id)
    }

    const upsertNode = async (type: NodeType, entityId: string, label: string): Promise<string> => {
      const key = `${type}:${entityId}`
      if (existingByKey.has(key)) return existingByKey.get(key)!
      const ref = await addDoc(collection(db, 'graphNodes'), {
        userId, type, entityId, label,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      existingByKey.set(key, ref.id)
      this.nodes.push({ id: ref.id, userId, type, entityId, label, createdAt: new Date(), updatedAt: new Date() })
      return ref.id
    }

    // Bootstrap entity nodes
    for (const p of peopleStore.people) {
      await upsertNode('person', p.id, p.name)
    }
    for (const proj of projectsStore.projects) {
      await upsertNode('project', proj.id, proj.title)
    }
    for (const t of tasksStore.tasks) {
      await upsertNode('task', t.id, t.title)
    }
    for (const b of behaviorsStore.behaviors) {
      await upsertNode('behavior', b.id, b.title)
    }
    for (const m of meetingsStore.meetings) {
      await upsertNode('meeting', m.id, m.title)
    }
    for (const team of teamsStore.teams) {
      await upsertNode('team', team.id, team.name)
    }
    for (const c of coachingStore.records) {
      await upsertNode('coaching', c.id, c.title ?? `Coaching ${c.id}`)
    }

    // Fetch existing edges
    const existingEdgeSnap = await getDocs(
      query(collection(db, 'graphEdges'), where('userId', '==', userId))
    )
    const existingEdgeKeys = new Set<string>() // "sourceId:targetId:type"
    for (const d of existingEdgeSnap.docs) {
      const data = d.data()
      existingEdgeKeys.add(`${data.sourceId}:${data.targetId}:${data.type}`)
    }

    const upsertEdge = async (
      sourceType: NodeType, sourceEntityId: string,
      targetType: NodeType, targetEntityId: string,
      type: EdgeType, label?: string
    ) => {
      const sourceId = existingByKey.get(`${sourceType}:${sourceEntityId}`)
      const targetId = existingByKey.get(`${targetType}:${targetEntityId}`)
      if (!sourceId || !targetId) return
      const key = `${sourceId}:${targetId}:${type}`
      if (existingEdgeKeys.has(key)) return
      existingEdgeKeys.add(key)
      const ref = await addDoc(collection(db, 'graphEdges'), {
        userId, sourceId, targetId, type, label,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      this.edges.push({ id: ref.id, userId, sourceId, targetId, type, label, createdAt: new Date(), updatedAt: new Date() })
    }

    // Bootstrap edges from existing relationships
    for (const proj of projectsStore.projects) {
      for (const memberId of proj.members ?? []) {
        await upsertEdge('person', memberId, 'project', proj.id, 'member')
      }
      for (const stakeholderId of proj.stakeholders ?? []) {
        await upsertEdge('person', stakeholderId, 'project', proj.id, 'stakeholder')
      }
      for (const taskId of proj.tasks ?? []) {
        await upsertEdge('project', proj.id, 'task', taskId, 'contains')
      }
    }
    for (const t of tasksStore.tasks) {
      if (t.assignee) await upsertEdge('task', t.id, 'person', t.assignee, 'assignee')
      if (t.projectId) await upsertEdge('task', t.id, 'project', t.projectId, 'related')
      for (const subtaskId of t.subtasks ?? []) {
        await upsertEdge('task', t.id, 'task', subtaskId, 'subtask')
      }
    }
    for (const m of meetingsStore.meetings) {
      for (const participantId of m.participants ?? []) {
        await upsertEdge('person', participantId, 'meeting', m.id, 'participant')
      }
      for (const projId of m.relatedProjects ?? []) {
        await upsertEdge('meeting', m.id, 'project', projId, 'related')
      }
    }
    for (const b of behaviorsStore.behaviors) {
      for (const plan of b.actionPlans ?? []) {
        for (const taskId of plan.tasks ?? []) {
          await upsertEdge('behavior', b.id, 'task', taskId, 'action-plan')
        }
      }
    }
    for (const team of teamsStore.teams) {
      for (const memberId of team.memberPersonIds ?? []) {
        await upsertEdge('person', memberId, 'team', team.id, 'member')
      }
    }

    this.bootstrapped = true
  },

  async createEdge(partial: Omit<GraphEdge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    const { db } = await import('~/plugins/firebase')
    const authStore = useAuthStore()
    const userId = authStore.user?.uid
    if (!userId) return
    const ref = await addDoc(collection(db, 'graphEdges'), {
      userId, ...partial,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    const edge: GraphEdge = { id: ref.id, userId, ...partial, createdAt: new Date(), updatedAt: new Date() }
    this.edges.push(edge)
    return edge
  },

  async deleteEdge(id: string) {
    const { doc, deleteDoc } = await import('firebase/firestore')
    const { db } = await import('~/plugins/firebase')
    await deleteDoc(doc(db, 'graphEdges', id))
    this.edges = this.edges.filter(e => e.id !== id)
  },
},
```

Also add the missing imports at the top of `stores/network.ts`:

```typescript
import { useAuthStore } from '~/stores/auth'
import type { NodeType, EdgeType } from '~/types/models/network'
```

- [ ] **Step 4: Run tests**

```bash
cd organizer-app
npm run test -- tests/unit/stores/network.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add stores/network.ts tests/unit/stores/network.test.ts
git commit -m "feat(network): implement load() and syncFromStores() with idempotency"
```

---

### Task 4: Install 3d-force-graph

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
cd organizer-app
npm install 3d-force-graph
```

- [ ] **Step 2: Verify types are available**

```bash
cd organizer-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors (or only pre-existing ones unrelated to 3d-force-graph).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(network): install 3d-force-graph"
```

---

### Task 5: NetworkGraph3D component

**Files:**
- Create: `components/network/NetworkGraph3D.vue`

- [ ] **Step 1: Create the component**

Create `organizer-app/components/network/NetworkGraph3D.vue`:

```pug
//- template
template(lang="pug")
  div(ref="containerEl" style="width:100%;height:100%;position:relative")
    div.graph-overlay(v-if="loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)")
      v-progress-circular(indeterminate color="primary")
```

```typescript
// script
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { GraphNode, GraphEdge } from '~/types/models/network'
import { NODE_COLORS, NODE_BASE_SIZES } from '~/config/network'

const props = defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  pinnedNodeIds: string[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'node-click': [node: GraphNode]
  'node-ctrl-click': [node: GraphNode]
  'node-dblclick': [node: GraphNode]
  'node-rightclick': [node: GraphNode, event: MouseEvent]
}>()

const containerEl = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let graph: any = null
let lastClickTime = 0
const DBL_CLICK_MS = 300

const graphData = computed(() => ({
  nodes: props.nodes.map(n => ({ ...n })),
  links: props.edges.map(e => ({
    ...e,
    source: e.sourceId,
    target: e.targetId,
  })),
}))

onMounted(async () => {
  if (!containerEl.value) return
  const { default: ForceGraph3D } = await import('3d-force-graph')

  graph = ForceGraph3D()(containerEl.value)
    .backgroundColor('#11111b')
    .nodeColor((n: any) => {
      if (props.selectedNodeId === n.id) return '#ffffff'
      return NODE_COLORS[n.type as GraphNode['type']] ?? '#888888'
    })
    .nodeVal((n: any) => {
      const base = NODE_BASE_SIZES[n.type as GraphNode['type']] ?? 4
      const pinBonus = props.pinnedNodeIds.includes(n.id) ? 3 : 0
      return base + pinBonus
    })
    .nodeLabel((n: any) => n.label)
    .linkColor(() => 'rgba(255,255,255,0.12)')
    .linkLabel((l: any) => l.label ?? l.type)
    .onNodeClick((n: any, event: MouseEvent) => {
      const now = Date.now()
      if (now - lastClickTime < DBL_CLICK_MS) {
        emit('node-dblclick', n)
      } else {
        if (event.ctrlKey || event.metaKey) {
          emit('node-ctrl-click', n)
        } else {
          emit('node-click', n)
        }
      }
      lastClickTime = now
    })
    .onNodeRightClick((n: any, event: MouseEvent) => {
      event.preventDefault()
      emit('node-rightclick', n, event)
    })
    .graphData(graphData.value)
})

watch(graphData, (data) => {
  graph?.graphData(data)
}, { deep: true })

watch(() => [props.selectedNodeId, props.pinnedNodeIds], () => {
  graph?.nodeColor((n: any) => {
    if (props.selectedNodeId === n.id) return '#ffffff'
    return NODE_COLORS[n.type as GraphNode['type']] ?? '#888888'
  })
  graph?.nodeVal((n: any) => {
    const base = NODE_BASE_SIZES[n.type as GraphNode['type']] ?? 4
    const pinBonus = props.pinnedNodeIds.includes(n.id) ? 3 : 0
    return base + pinBonus
  })
})

onUnmounted(() => {
  try { graph?._destructor?.() } catch { /* ignore */ }
})
</script>
```

Note: `3d-force-graph` does not have official TypeScript declarations; the `any` casts above are necessary and correct.

- [ ] **Step 2: Verify it compiles**

```bash
cd organizer-app
npx vue-tsc --noEmit 2>&1 | grep -i "network" | head -20
```

Expected: no errors in `components/network/NetworkGraph3D.vue`.

- [ ] **Step 3: Commit**

```bash
git add components/network/NetworkGraph3D.vue
git commit -m "feat(network): add NetworkGraph3D component wrapping 3d-force-graph"
```

---

### Task 6: NetworkSidebar component

**Files:**
- Create: `components/network/NetworkSidebar.vue`

- [ ] **Step 1: Create the component**

Create `organizer-app/components/network/NetworkSidebar.vue`:

```pug
template(lang="pug")
  v-navigation-drawer(
    permanent
    width="220"
    color="surface"
  )
    v-list-subheader {{ $t('network.sidebar.nodeTypes') }}
    v-list(density="compact")
      v-list-item(
        v-for="type in nodeTypes"
        :key="type.value"
        :prepend-icon="type.icon"
        :title="$t(`network.nodeType.${type.value}`)"
        slim
      )
        template(#append)
          v-switch(
            :model-value="visibleTypes.includes(type.value)"
            color="primary"
            density="compact"
            hide-details
            @update:model-value="toggleType(type.value)"
          )

    v-divider.my-2

    v-list-subheader {{ $t('network.sidebar.depth') }}
    .px-4.pb-2
      .text-caption.mb-1 {{ $t('network.sidebar.depthValue', { n: depth }) }}
      v-slider(
        :model-value="depth"
        :min="1"
        :max="5"
        :step="1"
        thumb-label
        color="primary"
        @update:model-value="$emit('update:depth', $event)"
      )
        template(#thumb-label="{ modelValue }")
          span {{ modelValue === 5 ? '∞' : modelValue }}

    v-divider.my-2

    v-list-subheader {{ $t('network.sidebar.pinnedNodes') }}
    .px-3
      v-chip-group(v-if="pinnedNodes.length")
        v-chip(
          v-for="node in pinnedNodes"
          :key="node.id"
          closable
          size="small"
          @click:close="$emit('unpin', node.id)"
        ) {{ node.label }}
      .text-caption.text-disabled(v-else) {{ $t('network.sidebar.noPins') }}

    v-divider.my-2

    v-list-subheader {{ $t('network.sidebar.shortestPath') }}
    .px-3.pb-2
      .text-caption.mb-1 {{ $t('network.sidebar.pathFrom') }}
      .text-body-2.mb-1 {{ pathFrom?.label ?? '—' }}
      .text-caption.mb-1 {{ $t('network.sidebar.pathTo') }}
      v-autocomplete(
        density="compact"
        variant="outlined"
        :items="pathTargetOptions"
        item-title="label"
        item-value="id"
        :model-value="pathTo"
        :placeholder="$t('network.sidebar.pickNode')"
        hide-details
        clearable
        @update:model-value="$emit('update:pathTo', $event)"
      )
      v-btn(
        class="mt-2"
        block
        variant="tonal"
        size="small"
        :disabled="!pathFrom || !pathTo"
        @click="$emit('find-path')"
      ) {{ $t('network.sidebar.showPath') }}

    v-divider.my-2

    v-list-subheader {{ $t('network.sidebar.timeRange') }}
    .px-3.pb-2
      v-select(
        density="compact"
        variant="outlined"
        :items="timeRangeOptions"
        :model-value="timeRange"
        hide-details
        @update:model-value="$emit('update:timeRange', $event)"
      )
```

```typescript
<script setup lang="ts">
import { computed } from 'vue'
import type { GraphNode, NodeType } from '~/types/models/network'
import { NODE_COLORS } from '~/config/network'

const props = defineProps<{
  visibleTypes: NodeType[]
  depth: number
  pinnedNodes: GraphNode[]
  pathFrom: GraphNode | null
  pathTo: string | null
  allNodes: GraphNode[]
  timeRange: string
}>()

const emit = defineEmits<{
  'toggle-type': [type: NodeType]
  'update:depth': [value: number]
  'unpin': [nodeId: string]
  'update:pathTo': [nodeId: string | null]
  'find-path': []
  'update:timeRange': [value: string]
}>()

const nodeTypes = [
  { value: 'person' as NodeType,   icon: 'mdi-account' },
  { value: 'project' as NodeType,  icon: 'mdi-folder-multiple' },
  { value: 'task' as NodeType,     icon: 'mdi-checkbox-marked-outline' },
  { value: 'behavior' as NodeType, icon: 'mdi-account-cog' },
  { value: 'meeting' as NodeType,  icon: 'mdi-account-group-outline' },
  { value: 'team' as NodeType,     icon: 'mdi-account-multiple-outline' },
  { value: 'coaching' as NodeType, icon: 'mdi-account-heart' },
  { value: 'knowledge' as NodeType,icon: 'mdi-lightbulb-outline' },
]

const timeRangeOptions = [
  { title: 'All time', value: 'all' },
  { title: 'Last 30 days', value: '30d' },
  { title: 'Last 90 days', value: '90d' },
]

const pathTargetOptions = computed(() =>
  props.allNodes.filter(n => n.id !== props.pathFrom?.id)
)

function toggleType(type: NodeType) {
  // delegated to parent via emit
}
</script>
```

Fix the missing `toggleType` — it should emit:

```typescript
function toggleType(type: NodeType) {
  emit('toggle-type', type)
}
```

- [ ] **Step 2: Commit**

```bash
git add components/network/NetworkSidebar.vue
git commit -m "feat(network): add NetworkSidebar component with type toggles, depth, pins, path"
```

---

### Task 7: NetworkNodeDetail component

**Files:**
- Create: `components/network/NetworkNodeDetail.vue`

- [ ] **Step 1: Create the component**

Create `organizer-app/components/network/NetworkNodeDetail.vue`:

```pug
template(lang="pug")
  v-card(v-if="node" flat color="surface-variant")
    v-card-title.d-flex.align-center.gap-2
      v-icon(:color="nodeColor") {{ nodeIcon }}
      span.text-body-1 {{ node.label }}
      v-spacer
      v-chip(v-if="isPinned" size="x-small" color="warning" prepend-icon="mdi-pin")
        | {{ $t('network.pinned') }}
    v-card-subtitle {{ $t(`network.nodeType.${node.type}`) }}
    v-card-actions
      v-btn(
        variant="tonal"
        size="small"
        :to="entityRoute"
        prepend-icon="mdi-open-in-new"
      ) {{ $t('network.openRecord') }}
      v-btn(
        variant="tonal"
        size="small"
        prepend-icon="mdi-pin-outline"
        @click="$emit('toggle-pin', node.id)"
      ) {{ isPinned ? $t('network.unpin') : $t('network.pin') }}

    v-divider

    v-card-text(v-if="knowledge.length")
      .text-overline.mb-2 {{ $t('network.knowledge') }} ({{ knowledge.length }})
      v-list(density="compact")
        v-list-item(
          v-for="k in knowledge"
          :key="k.id"
        )
          template(#prepend)
            v-icon(size="small" color="secondary") mdi-lightbulb-outline
          v-list-item-title.text-caption.text-wrap {{ k.content }}
          v-list-item-subtitle
            v-chip(:color="certaintyColor(k.certainty)" size="x-small" class="mr-1")
              | {{ Math.round(k.certainty * 100) }}%
            span.text-caption {{ k.subtype }} · {{ formatDate(k.certaintyDate) }}
      v-btn(
        block
        variant="text"
        size="small"
        prepend-icon="mdi-plus"
        @click="$emit('add-knowledge', node)"
      ) {{ $t('network.addKnowledge') }}

    v-card-text(v-else)
      v-btn(
        block
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        @click="$emit('add-knowledge', node)"
      ) {{ $t('network.addKnowledge') }}
```

```typescript
<script setup lang="ts">
import { computed } from 'vue'
import type { GraphNode, KnowledgeNode } from '~/types/models/network'
import { NODE_COLORS } from '~/config/network'
import { useRouter } from 'vue-router'

const props = defineProps<{
  node: GraphNode | null
  knowledge: KnowledgeNode[]
  isPinned: boolean
}>()

defineEmits<{
  'toggle-pin': [nodeId: string]
  'add-knowledge': [node: GraphNode]
}>()

const nodeColor = computed(() =>
  props.node ? NODE_COLORS[props.node.type] : '#888'
)

const nodeIcons: Record<string, string> = {
  person:    'mdi-account',
  project:   'mdi-folder-multiple',
  task:      'mdi-checkbox-marked-outline',
  behavior:  'mdi-account-cog',
  meeting:   'mdi-account-group-outline',
  team:      'mdi-account-multiple-outline',
  coaching:  'mdi-account-heart',
  knowledge: 'mdi-lightbulb-outline',
}

const nodeIcon = computed(() => props.node ? nodeIcons[props.node.type] ?? 'mdi-circle' : '')

const entityRoutes: Record<string, string> = {
  person:   '/people',
  project:  '/projects',
  task:     '/tasks',
  behavior: '/behaviors',
  meeting:  '/meetings',
  team:     '/teams',
  coaching: '/coaching',
}

const entityRoute = computed(() => {
  if (!props.node?.entityId) return null
  const base = entityRoutes[props.node.type]
  return base ? `${base}/${props.node.entityId}` : null
})

function certaintyColor(certainty: number): string {
  if (certainty >= 0.8) return 'success'
  if (certainty >= 0.6) return 'warning'
  return 'error'
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date))
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/network/NetworkNodeDetail.vue
git commit -m "feat(network): add NetworkNodeDetail component with knowledge list"
```

---

### Task 8: Rewrite pages/network/index.vue

**Files:**
- Rewrite: `pages/network/index.vue`

- [ ] **Step 1: Rewrite the page**

Replace the full contents of `organizer-app/pages/network/index.vue`:

```pug
template(lang="pug")
  v-app-bar(flat)
    v-app-bar-nav-icon(@click="drawer = !drawer")
    v-toolbar-title
      span.text-disabled {{ $t('app.name') }} /&nbsp;
      v-icon(size="small" class="mr-1") mdi-graph
      | {{ $t('network.title') }}
    v-spacer
    v-btn(
      icon="mdi-lightbulb-plus-outline"
      variant="text"
      :title="$t('network.addKnowledge')"
    )
    v-btn(
      icon="mdi-refresh"
      variant="text"
      :loading="networkStore.loading"
      :title="$t('network.sync')"
      @click="handleSync"
    )

  v-main
    .d-flex(style="height:calc(100vh - 64px)")
      NetworkSidebar(
        :visible-types="visibleTypes"
        :depth="depth"
        :pinned-nodes="pinnedGraphNodes"
        :path-from="selectedNode"
        :path-to="pathToId"
        :all-nodes="networkStore.nodes"
        :time-range="timeRange"
        @toggle-type="toggleType"
        @update:depth="depth = $event"
        @unpin="unpinNode"
        @update:path-to="pathToId = $event"
        @find-path="findPath"
        @update:time-range="timeRange = $event"
      )

      //- 3D Graph Canvas
      .flex-grow-1(style="position:relative")
        NetworkGraph3D(
          :nodes="filteredNodes"
          :edges="filteredEdges"
          :selected-node-id="selectedNode?.id ?? null"
          :pinned-node-ids="pinnedNodeIds"
          :loading="networkStore.loading"
          @node-click="selectNode"
          @node-ctrl-click="togglePin"
          @node-dblclick="navigateToRecord"
          @node-rightclick="openContextMenu"
        )

        //- Path highlight overlay label
        v-chip(
          v-if="pathNodes.length"
          style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%)"
          color="success"
          prepend-icon="mdi-vector-line"
          closable
          @click:close="clearPath"
        ) {{ $t('network.pathLength', { n: pathNodes.length - 1 }) }}

      //- Right panel
      .pa-3(style="width:260px;overflow-y:auto;background:rgb(var(--v-theme-surface))")
        NetworkNodeDetail(
          v-if="selectedNode"
          :node="selectedNode"
          :knowledge="selectedNodeKnowledge"
          :is-pinned="pinnedNodeIds.includes(selectedNode?.id ?? '')"
          @toggle-pin="togglePin({ id: $event } as any)"
          @add-knowledge="openAddKnowledge"
        )
        .text-center.text-disabled.mt-8(v-else)
          v-icon(size="48") mdi-cursor-default-click-outline
          .mt-2 {{ $t('network.selectNode') }}
```

```typescript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNetworkStore } from '~/stores/network'
import { useNotificationStore } from '~/stores/notification'
import type { GraphNode, KnowledgeNode, NodeType } from '~/types/models/network'
import { isKnowledgeNode } from '~/types/models/network'
import { GRAPH_DEFAULTS } from '~/config/network'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const networkStore = useNetworkStore()
const notifyStore = useNotificationStore()

// UI state
const drawer = ref(true)
const selectedNode = ref<GraphNode | null>(null)
const pinnedNodeIds = ref<string[]>([])
const depth = ref(GRAPH_DEFAULTS.depth)
const pathToId = ref<string | null>(null)
const pathNodes = ref<GraphNode[]>([])
const timeRange = ref('all')
const visibleTypes = ref<NodeType[]>([
  'person', 'project', 'task', 'behavior', 'meeting', 'team', 'coaching', 'knowledge',
])

const contextMenuNode = ref<GraphNode | null>(null)
const contextMenuPos = ref({ x: 0, y: 0 })

// Derived
const pinnedGraphNodes = computed(() =>
  pinnedNodeIds.value
    .map(id => networkStore.getNode(id))
    .filter((n): n is GraphNode => !!n)
)

const filteredNodes = computed(() => {
  let nodes = networkStore.nodes.filter(n => visibleTypes.value.includes(n.type))

  if (pinnedNodeIds.value.length > 0) {
    // Multi-pin: show pinned + their shared neighbourhood
    const reachable = new Set<string>(pinnedNodeIds.value)
    for (const id of pinnedNodeIds.value) {
      const neighbours = networkStore.getNeighbours(id, depth.value)
      neighbours.forEach(n => reachable.add(n.id))
    }
    nodes = nodes.filter(n => reachable.has(n.id))
  } else if (selectedNode.value) {
    // Focus mode: show selected + neighbourhood
    const reachable = new Set<string>([selectedNode.value.id])
    networkStore.getNeighbours(selectedNode.value.id, depth.value)
      .forEach(n => reachable.add(n.id))
    nodes = nodes.filter(n => reachable.has(n.id))
  }

  if (timeRange.value !== 'all') {
    const days = timeRange.value === '30d' ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    nodes = nodes.filter(n => new Date(n.createdAt) >= cutoff)
  }

  return nodes
})

const filteredNodeIds = computed(() => new Set(filteredNodes.value.map(n => n.id)))

const filteredEdges = computed(() =>
  networkStore.edges.filter(
    e => filteredNodeIds.value.has(e.sourceId) && filteredNodeIds.value.has(e.targetId)
  )
)

const selectedNodeKnowledge = computed((): KnowledgeNode[] => {
  if (!selectedNode.value) return []
  return networkStore.knowledgeFor(selectedNode.value.id, GRAPH_DEFAULTS.minCertainty)
})

// Handlers
function selectNode(node: GraphNode) {
  selectedNode.value = node
  pathNodes.value = []
}

function togglePin(node: GraphNode) {
  const idx = pinnedNodeIds.value.indexOf(node.id)
  if (idx >= 0) {
    pinnedNodeIds.value.splice(idx, 1)
  } else {
    pinnedNodeIds.value.push(node.id)
  }
}

function unpinNode(nodeId: string) {
  pinnedNodeIds.value = pinnedNodeIds.value.filter(id => id !== nodeId)
}

function toggleType(type: NodeType) {
  const idx = visibleTypes.value.indexOf(type)
  if (idx >= 0) {
    visibleTypes.value.splice(idx, 1)
  } else {
    visibleTypes.value.push(type)
  }
}

function navigateToRecord(node: GraphNode) {
  if (!node.entityId) return
  const routes: Record<string, string> = {
    person: '/people', project: '/projects', task: '/tasks',
    behavior: '/behaviors', meeting: '/meetings', team: '/teams', coaching: '/coaching',
  }
  const base = routes[node.type]
  if (base) router.push(`${base}/${node.entityId}`)
}

function openContextMenu(node: GraphNode, event: MouseEvent) {
  // Placeholder — context menu component added in Task 4 of Plan 2
}

function openAddKnowledge(node: GraphNode) {
  // Placeholder — KnowledgeNodeForm added in Plan 2
}

function findPath() {
  if (!selectedNode.value || !pathToId.value) return
  pathNodes.value = networkStore.shortestPath(selectedNode.value.id, pathToId.value)
  if (pathNodes.value.length === 0) {
    notifyStore.info($t('network.noPath'))
  }
}

function clearPath() {
  pathNodes.value = []
  pathToId.value = null
}

async function handleSync() {
  await networkStore.syncFromStores()
  notifyStore.success($t('network.syncComplete'))
}

onMounted(async () => {
  await networkStore.load()
  if (!networkStore.bootstrapped) {
    await networkStore.syncFromStores()
  }
})
</script>
```

Note: `$t` is used in the script block — add the composable import:

```typescript
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()
```

- [ ] **Step 2: Commit**

```bash
git add pages/network/index.vue
git commit -m "feat(network): rewrite network page with 3D graph, depth filter, pin mode, path"
```

---

### Task 9: i18n keys

**Files:**
- Modify: `locales/en.ts`
- Modify: `locales/nl.ts`

- [ ] **Step 1: Add English keys**

Add to the `network` section of `organizer-app/locales/en.ts` (create the key if it doesn't exist):

```typescript
network: {
  title: 'Network',
  selectNode: 'Click a node to see details',
  openRecord: 'Open record',
  pin: 'Pin',
  unpin: 'Unpin',
  pinned: 'Pinned',
  addKnowledge: 'Add knowledge',
  knowledge: 'Knowledge',
  sync: 'Sync from stores',
  syncComplete: 'Network synced',
  noPath: 'No path found between these nodes',
  pathLength: '{n} hops',
  nodeType: {
    person: 'Person',
    project: 'Project',
    task: 'Task',
    behavior: 'Behavior',
    meeting: 'Meeting',
    team: 'Team',
    coaching: 'Coaching',
    knowledge: 'Knowledge',
  },
  sidebar: {
    nodeTypes: 'Show node types',
    depth: 'Graph depth',
    depthValue: '{n} hops from focus',
    pinnedNodes: 'Pinned nodes',
    noPins: 'Ctrl+click to pin nodes',
    shortestPath: 'Shortest path',
    pathFrom: 'From',
    pathTo: 'To',
    pickNode: 'Pick a node...',
    showPath: 'Show path',
    timeRange: 'Time range',
  },
},
```

- [ ] **Step 2: Add Dutch keys**

Add to `organizer-app/locales/nl.ts`:

```typescript
network: {
  title: 'Netwerk',
  selectNode: 'Klik een knooppunt om details te zien',
  openRecord: 'Open record',
  pin: 'Vastzetten',
  unpin: 'Losmaken',
  pinned: 'Vastgezet',
  addKnowledge: 'Kennis toevoegen',
  knowledge: 'Kennis',
  sync: 'Synchroniseren',
  syncComplete: 'Netwerk gesynchroniseerd',
  noPath: 'Geen pad gevonden tussen deze knooppunten',
  pathLength: '{n} stappen',
  nodeType: {
    person: 'Persoon',
    project: 'Project',
    task: 'Taak',
    behavior: 'Gedrag',
    meeting: 'Vergadering',
    team: 'Team',
    coaching: 'Coaching',
    knowledge: 'Kennis',
  },
  sidebar: {
    nodeTypes: 'Knooppunttypen',
    depth: 'Grafiekdiepte',
    depthValue: '{n} stappen van focus',
    pinnedNodes: 'Vastgezette knooppunten',
    noPins: 'Ctrl+klik om vast te zetten',
    shortestPath: 'Kortste pad',
    pathFrom: 'Van',
    pathTo: 'Naar',
    pickNode: 'Kies een knooppunt...',
    showPath: 'Toon pad',
    timeRange: 'Tijdsbereik',
  },
},
```

- [ ] **Step 3: Commit**

```bash
git add locales/en.ts locales/nl.ts
git commit -m "feat(network): add i18n keys for network module (en + nl)"
```

---

### Task 10: End-to-end smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd organizer-app
make dev
```

- [ ] **Step 2: Navigate to /network**

Open `http://localhost:3000/network`. Expected:
- 3D graph renders (may be empty if no data yet)
- Left sidebar shows type toggles, depth slider, pin section, path finder
- Right panel shows "Click a node to see details"
- No console errors

- [ ] **Step 3: Trigger sync**

Click the refresh icon in the top bar. Expected:
- Loading spinner appears briefly
- Success notification "Network synced"
- Nodes appear in the graph for any existing people/projects/tasks

- [ ] **Step 4: Interact with the graph**

- Click a node → right panel shows node name, type, "Open record" button
- Click a second node → Ctrl+click first → both show in pinned list → graph narrows to their neighbourhood
- Double-click a person node → navigates to `/people/<id>`

- [ ] **Step 5: Run unit tests**

```bash
cd organizer-app
make test
```

Expected: all tests pass including the new `tests/unit/stores/network.test.ts`.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat(network): complete Plan 1 — graph store + 3D visualization foundation"
```

---

## What comes next

- **Plan 2:** Knowledge nodes — `KnowledgeNodeForm`, knowledge CRUD, "Extract knowledge" button in other modules, knowledge subtype filter in sidebar
- **Plan 3:** AI integration — `utils/buildGraphContext.ts`, inject context into `BaseAIProvider`, `GraphQueryPanel` component, save insights back to graph
- **Plan 4:** Advanced features — graph analytics (degree, cluster), time travel animation, export
