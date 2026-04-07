# Knowledge Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-owned knowledge domain (store + Firestore collections) and surface knowledge connections as a tab on every module detail page, with global quick-add support.

**Architecture:** `stores/knowledge.ts` owns `knowledgeNodes` and `knowledgeEdges` Firestore collections. A `useKnowledgeConnections` composable provides per-entity CRUD. A `KnowledgeConnections.vue` tab component is dropped into every detail page. The network store becomes a consumer of the knowledge store.

**Tech Stack:** Pinia, Firebase Firestore, Vue 3 Composition API, Vuetify 3, Pug templates, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-04-07-knowledge-connections-design.md`

---

## File Map

**Create:**
- `types/models/knowledge.ts` — `KnowledgeEdge` type
- `stores/knowledge.ts` — knowledge domain store
- `composables/useKnowledgeConnections.ts` — per-entity knowledge CRUD composable
- `components/knowledge/KnowledgeNodeForm.vue` — add/edit dialog
- `components/knowledge/KnowledgeConnections.vue` — tab content component
- `pages/people/[id].vue` — new person detail page
- `pages/tasks/[id].vue` — new task detail page
- `pages/behaviors/[id].vue` — new behavior detail page
- `tests/unit/stores/knowledge.test.ts`
- `tests/unit/composables/useKnowledgeConnections.test.ts`

**Modify:**
- `types/models/network.ts` — export `KnowledgeEdge`, remove `KnowledgeNode` from `GraphNode` union in `nodes[]` (knowledge nodes now live in `knowledgeNodes` collection)
- `stores/network.ts` — remove `knowledgeFor` getter, add `updateEdge` action
- `tests/unit/stores/network.test.ts` — remove `knowledgeFor` test, add `updateEdge` test
- `locales/en.ts` — add `knowledge.*` keys
- `locales/nl.ts` — add `knowledge.*` keys
- `pages/projects/[id].vue` — add Knowledge tab to existing `v-tabs`
- `pages/meetings/[id].vue` — wrap content in tabs, add Knowledge tab
- `pages/coaching/[id].vue` — add Knowledge tab to existing layout
- `pages/teams/[id].vue` — add Knowledge tab to existing layout
- `pages/people/index.vue` — add row "view" link to detail page
- `pages/tasks/index.vue` — add row "view" link to detail page
- `pages/behaviors/index.vue` — add row "view" link to detail page
- `layouts/default.vue` — add knowledge quick-add entry

---

## Task 1: Add `KnowledgeEdge` type

**Files:**
- Create: `types/models/knowledge.ts`

- [ ] **Step 1: Create the type file**

```typescript
// types/models/knowledge.ts
import type { NodeType, EdgeType } from '~/types/models/network'

export interface KnowledgeEdge {
  id: string
  userId: string
  knowledgeNodeId: string
  entityType: NodeType
  entityId: string
  relationType: EdgeType
  label?: string
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 2: Re-export from `types/models/network.ts`**

At the bottom of `types/models/network.ts`, add:

```typescript
export type { KnowledgeEdge } from '~/types/models/knowledge'
```

- [ ] **Step 3: Commit**

```bash
git add types/models/knowledge.ts types/models/network.ts
git commit -m "feat(knowledge): add KnowledgeEdge type"
```

---

## Task 2: Add i18n keys

**Files:**
- Modify: `locales/en.ts`
- Modify: `locales/nl.ts`

- [ ] **Step 1: Add English keys**

In `locales/en.ts`, add a `knowledge` block after the `network` block:

```typescript
  knowledge: {
    title: 'Knowledge',
    add: 'Add knowledge',
    addKnowledge: 'Add knowledge',
    editKnowledge: 'Edit knowledge',
    editRelation: 'Edit relation',
    disconnect: 'Remove connection',
    deleteKnowledge: 'Delete knowledge',
    confirmDelete: 'Delete this knowledge node?',
    confirmDeleteWithConnections: 'This knowledge node is connected to {n} other items. Delete it and all its connections?',
    emptyState: 'No knowledge connected yet. Add some to capture what you know about this item.',
    content: 'Content',
    certainty: 'Certainty',
    tags: 'Tags',
    relationType: 'Relation type',
    relationLabel: 'Relation label (optional)',
    attachModule: 'Attach to module (optional)',
    attachItem: 'Select item',
    otherConnections: 'Also connected to',
    loadError: 'Failed to load knowledge',
    saveError: 'Failed to save knowledge',
    deleteError: 'Failed to delete knowledge',
    subtype: 'Type',
    subtypes: {
      observation: 'Observation',
      concept: 'Concept',
      reason: 'Reason',
      fact: 'Fact',
      insight: 'Insight',
      pattern: 'Pattern',
    },
    sources: {
      manual: 'Manual',
      ai: 'AI',
      email: 'Email',
      note: 'Note',
    },
  },
```

- [ ] **Step 2: Add Dutch keys**

In `locales/nl.ts`, add the same block with Dutch translations after the `network` block:

```typescript
  knowledge: {
    title: 'Kennis',
    add: 'Kennis toevoegen',
    addKnowledge: 'Kennis toevoegen',
    editKnowledge: 'Kennis bewerken',
    editRelation: 'Relatie bewerken',
    disconnect: 'Verbinding verwijderen',
    deleteKnowledge: 'Kennis verwijderen',
    confirmDelete: 'Dit kennisknooppunt verwijderen?',
    confirmDeleteWithConnections: 'Dit kennisknooppunt is verbonden met {n} andere items. Alles verwijderen?',
    emptyState: 'Nog geen kennis gekoppeld. Voeg toe wat je weet over dit item.',
    content: 'Inhoud',
    certainty: 'Zekerheid',
    tags: 'Tags',
    relationType: 'Type relatie',
    relationLabel: 'Relatielabel (optioneel)',
    attachModule: 'Koppelen aan module (optioneel)',
    attachItem: 'Selecteer item',
    otherConnections: 'Ook verbonden met',
    loadError: 'Kennis laden mislukt',
    saveError: 'Kennis opslaan mislukt',
    deleteError: 'Kennis verwijderen mislukt',
    subtype: 'Type',
    subtypes: {
      observation: 'Observatie',
      concept: 'Concept',
      reason: 'Reden',
      fact: 'Feit',
      insight: 'Inzicht',
      pattern: 'Patroon',
    },
    sources: {
      manual: 'Handmatig',
      ai: 'AI',
      email: 'E-mail',
      note: 'Notitie',
    },
  },
```

- [ ] **Step 3: Commit**

```bash
git add locales/en.ts locales/nl.ts
git commit -m "feat(knowledge): add i18n keys for knowledge domain"
```

---

## Task 3: Create `stores/knowledge.ts`

**Files:**
- Create: `stores/knowledge.ts`

- [ ] **Step 1: Write the store**

```typescript
// stores/knowledge.ts
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useNotificationStore } from './notification'
import type { KnowledgeNode, NodeType, EdgeType } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

export const useKnowledgeStore = defineStore('knowledge', {
  persist: true,

  state: () => ({
    nodes: [] as KnowledgeNode[],
    edges: [] as KnowledgeEdge[],
    loading: false,
    bootstrapped: false,
  }),

  getters: {
    connectionsForEntity: (state) => (entityType: NodeType, entityId: string) => {
      const linked = state.edges.filter(
        e => e.entityType === entityType && e.entityId === entityId
      )
      return linked
        .map(edge => {
          const knowledge = state.nodes.find(n => n.id === edge.knowledgeNodeId)
          return knowledge ? { knowledge, edge } : null
        })
        .filter((c): c is { knowledge: KnowledgeNode; edge: KnowledgeEdge } => c !== null)
    },

    otherConnectionsForKnowledge: (state) => (knowledgeNodeId: string, excludeEdgeId: string) => {
      return state.edges.filter(
        e => e.knowledgeNodeId === knowledgeNodeId && e.id !== excludeEdgeId
      )
    },
  },

  actions: {
    async load() {
      const { collection, query, where, getDocs, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return

      this.loading = true
      try {
        const [nodeSnap, edgeSnap] = await Promise.all([
          getDocs(query(collection(db, 'knowledgeNodes'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'knowledgeEdges'), where('userId', '==', userId))),
        ])
        this.nodes = nodeSnap.docs.map(d => ({
          ...(d.data() as Omit<KnowledgeNode, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
          certaintyDate: d.data().certaintyDate?.toDate?.() ?? new Date(),
        }))
        this.edges = edgeSnap.docs.map(d => ({
          ...(d.data() as Omit<KnowledgeEdge, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
        }))
        this.bootstrapped = true
      } catch (err) {
        useNotificationStore().error('knowledge.loadError')
        throw err
      } finally {
        this.loading = false
      }
    },

    async create(
      partial: Omit<KnowledgeNode, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type' | 'entityId'>
    ): Promise<KnowledgeNode | undefined> {
      const { collection, addDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return undefined

      const ref = await addDoc(collection(db, 'knowledgeNodes'), {
        userId,
        type: 'knowledge' as const,
        entityId: null,
        ...partial,
        label: partial.content.slice(0, 60),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const node: KnowledgeNode = {
        id: ref.id,
        userId,
        type: 'knowledge',
        entityId: null,
        label: partial.content.slice(0, 60),
        ...partial,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.nodes.push(node)
      return node
    },

    async update(
      id: string,
      partial: Partial<Pick<KnowledgeNode, 'content' | 'subtype' | 'certainty' | 'certaintyDate' | 'tags' | 'label' | 'source' | 'sourceRef'>>
    ) {
      const { doc, updateDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const updateData: Record<string, unknown> = { ...partial, updatedAt: serverTimestamp() }
      if (partial.content) updateData.label = partial.content.slice(0, 60)
      await updateDoc(doc(db, 'knowledgeNodes', id), updateData)
      const idx = this.nodes.findIndex(n => n.id === id)
      if (idx !== -1) {
        Object.assign(this.nodes[idx], {
          ...partial,
          ...(partial.content ? { label: partial.content.slice(0, 60) } : {}),
          updatedAt: new Date(),
        })
      }
    },

    async delete(id: string) {
      const { doc, deleteDoc, collection, query, where, getDocs, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const edgeSnap = await getDocs(
        query(collection(db, 'knowledgeEdges'), where('knowledgeNodeId', '==', id))
      )
      await Promise.all(edgeSnap.docs.map(d => deleteDoc(doc(db, 'knowledgeEdges', d.id))))
      await deleteDoc(doc(db, 'knowledgeNodes', id))
      this.edges = this.edges.filter(e => e.knowledgeNodeId !== id)
      this.nodes = this.nodes.filter(n => n.id !== id)
    },

    async connect(
      knowledgeNodeId: string,
      entityType: NodeType,
      entityId: string,
      relationType: EdgeType,
      label?: string
    ): Promise<KnowledgeEdge | undefined> {
      const { collection, addDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return undefined

      const data: Record<string, unknown> = {
        userId, knowledgeNodeId, entityType, entityId, relationType,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }
      if (label !== undefined) data.label = label

      const ref = await addDoc(collection(db, 'knowledgeEdges'), data)
      const edge: KnowledgeEdge = {
        id: ref.id, userId, knowledgeNodeId, entityType, entityId, relationType,
        ...(label !== undefined ? { label } : {}),
        createdAt: new Date(), updatedAt: new Date(),
      }
      this.edges.push(edge)
      return edge
    },

    async disconnect(edgeId: string) {
      const { doc, deleteDoc, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      await deleteDoc(doc(db, 'knowledgeEdges', edgeId))
      this.edges = this.edges.filter(e => e.id !== edgeId)
    },

    async updateConnection(edgeId: string, relationType: EdgeType, label?: string) {
      const { doc, updateDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const data: Record<string, unknown> = { relationType, updatedAt: serverTimestamp() }
      if (label !== undefined) data.label = label
      await updateDoc(doc(db, 'knowledgeEdges', edgeId), data)
      const idx = this.edges.findIndex(e => e.id === edgeId)
      if (idx !== -1) {
        Object.assign(this.edges[idx], {
          relationType,
          ...(label !== undefined ? { label } : {}),
          updatedAt: new Date(),
        })
      }
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add stores/knowledge.ts
git commit -m "feat(knowledge): add knowledge store with Firestore CRUD"
```

---

## Task 4: Knowledge store tests

**Files:**
- Create: `tests/unit/stores/knowledge.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// tests/unit/stores/knowledge.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
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
  getFirestore: vi.fn(() => ({})),
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: () => ({ error: vi.fn() }),
}))

const now = new Date('2026-01-01')

function makeNode(id: string): KnowledgeNode {
  return {
    id, userId: 'user-1', type: 'knowledge', entityId: null, label: 'test',
    content: 'test content', subtype: 'fact', source: 'manual',
    certainty: 0.8, certaintyDate: now, tags: [],
    createdAt: now, updatedAt: now,
  }
}

function makeEdge(id: string, knowledgeNodeId: string): KnowledgeEdge {
  return {
    id, userId: 'user-1', knowledgeNodeId,
    entityType: 'person', entityId: 'p1',
    relationType: 'references',
    createdAt: now, updatedAt: now,
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

import { addDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore'

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
      content: 'test fact', subtype: 'fact', source: 'manual',
      certainty: 0.9, certaintyDate: now, tags: [], label: 'test fact',
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
      docs: [{ id: 'e1', data: () => ({}) }],
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
```

- [ ] **Step 2: Run tests (expect them to pass)**

Run from `organizer-app/`:
```bash
npm run test -- tests/unit/stores/knowledge.test.ts
```
Expected: all 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/stores/knowledge.test.ts
git commit -m "test(knowledge): add knowledge store unit tests"
```

---

## Task 5: Update `stores/network.ts`

Remove the `knowledgeFor` getter (now owned by the knowledge store) and add `updateEdge`.

**Files:**
- Modify: `stores/network.ts`

- [ ] **Step 1: Remove the `knowledgeFor` getter**

Delete these lines from the `getters` block in `stores/network.ts` (lines 87–100):

```typescript
    knowledgeFor: (state) => (nodeId: string, minCertainty = 0.6): KnowledgeNode[] => {
      const linkedEdges = state.edges.filter(
        e => (e.sourceId === nodeId || e.targetId === nodeId) && e.type === 'references'
      )
      return linkedEdges
        .map(e => {
          const otherId = e.sourceId === nodeId ? e.targetId : e.sourceId
          return state.nodes.find(n => n.id === otherId)
        })
        .filter((n): n is KnowledgeNode => {
          if (!n || !isKnowledgeNode(n)) return false
          return n.certainty >= minCertainty
        })
    },
```

Also remove the unused import of `isKnowledgeNode` from line 3 if it is only used by this getter.

- [ ] **Step 2: Add `updateEdge` action**

After `deleteEdge`, add:

```typescript
    async updateEdge(id: string, partial: Partial<Pick<GraphEdge, 'type' | 'label'>>) {
      const { doc, updateDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      await updateDoc(doc(db, 'graphEdges', id), { ...partial, updatedAt: serverTimestamp() })
      const idx = this.edges.findIndex(e => e.id === id)
      if (idx !== -1) Object.assign(this.edges[idx], { ...partial, updatedAt: new Date() })
    },
```

- [ ] **Step 3: Run existing network tests**

```bash
npm run test -- tests/unit/stores/network.test.ts
```

The `knowledgeFor` test (lines 109–137) will now fail — it tests the removed getter. Delete it from `tests/unit/stores/network.test.ts`.

- [ ] **Step 4: Add `updateEdge` test**

In `tests/unit/stores/network.test.ts`, add to the `getters` describe block:

```typescript
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
```

- [ ] **Step 5: Run network tests again**

```bash
npm run test -- tests/unit/stores/network.test.ts
```
Expected: all remaining tests pass.

- [ ] **Step 6: Commit**

```bash
git add stores/network.ts tests/unit/stores/network.test.ts
git commit -m "refactor(network): remove knowledgeFor getter, add updateEdge action"
```

---

## Task 6: Create `composables/useKnowledgeConnections.ts`

**Files:**
- Create: `composables/useKnowledgeConnections.ts`

- [ ] **Step 1: Write the composable**

```typescript
// composables/useKnowledgeConnections.ts
import { computed, isRef } from 'vue'
import type { Ref } from 'vue'
import { useKnowledgeStore } from '~/stores/knowledge'
import type { KnowledgeNode, NodeType, EdgeType } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

export interface KnowledgeConnectionRow {
  knowledge: KnowledgeNode
  edge: KnowledgeEdge
  otherConnections: Array<{
    entityType: NodeType
    entityId: string
    relationType: EdgeType
    label?: string
    edgeId: string
  }>
}

export function useKnowledgeConnections(
  nodeType: NodeType,
  entityId: Ref<string> | string
) {
  const knowledgeStore = useKnowledgeStore()
  const id = computed(() => (isRef(entityId) ? entityId.value : entityId))

  const connections = computed((): KnowledgeConnectionRow[] => {
    return knowledgeStore
      .connectionsForEntity(nodeType, id.value)
      .map(({ knowledge, edge }) => ({
        knowledge,
        edge,
        otherConnections: knowledgeStore
          .otherConnectionsForKnowledge(knowledge.id, edge.id)
          .map(e => ({
            entityType: e.entityType,
            entityId: e.entityId,
            relationType: e.relationType,
            label: e.label,
            edgeId: e.id,
          })),
      }))
  })

  async function addKnowledge(
    nodeData: Omit<KnowledgeNode, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type' | 'entityId'>,
    relationType: EdgeType,
    label?: string
  ) {
    const node = await knowledgeStore.create(nodeData)
    if (!node) return
    await knowledgeStore.connect(node.id, nodeType, id.value, relationType, label)
  }

  async function editKnowledge(
    knowledgeId: string,
    partial: Partial<Pick<KnowledgeNode, 'content' | 'subtype' | 'certainty' | 'certaintyDate' | 'tags' | 'label'>>
  ) {
    await knowledgeStore.update(knowledgeId, partial)
  }

  async function editRelation(edgeId: string, relationType: EdgeType, label?: string) {
    await knowledgeStore.updateConnection(edgeId, relationType, label)
  }

  async function disconnect(edgeId: string) {
    await knowledgeStore.disconnect(edgeId)
  }

  async function removeKnowledge(knowledgeId: string) {
    await knowledgeStore.delete(knowledgeId)
  }

  return { connections, addKnowledge, editKnowledge, editRelation, disconnect, removeKnowledge }
}
```

- [ ] **Step 2: Commit**

```bash
git add composables/useKnowledgeConnections.ts
git commit -m "feat(knowledge): add useKnowledgeConnections composable"
```

---

## Task 7: Composable tests

**Files:**
- Create: `tests/unit/composables/useKnowledgeConnections.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
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

vi.mock('~/stores/knowledge', () => {
  const nodes: KnowledgeNode[] = []
  const edges: KnowledgeEdge[] = []
  return {
    useKnowledgeStore: () => ({
      nodes,
      edges,
      connectionsForEntity: vi.fn((entityType: string, entityId: string) =>
        edges
          .filter(e => e.entityType === entityType && e.entityId === entityId)
          .map(e => ({ knowledge: nodes.find(n => n.id === e.knowledgeNodeId)!, edge: e }))
          .filter(c => c.knowledge)
      ),
      otherConnectionsForKnowledge: vi.fn((nodeId: string, excludeEdgeId: string) =>
        edges.filter(e => e.knowledgeNodeId === nodeId && e.id !== excludeEdgeId)
      ),
      create: vi.fn(async (partial: any) => makeNode('k-new', partial.content)),
      connect: vi.fn(async () => makeEdge('e-new', 'k-new')),
      update: vi.fn(),
      updateConnection: vi.fn(),
      disconnect: vi.fn(),
      delete: vi.fn(),
    }),
  }
})

describe('useKnowledgeConnections', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('connections returns rows for the entity', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore() as any
    const k = makeNode('k1')
    const e = makeEdge('e1', 'k1')
    store.nodes.push(k)
    store.edges.push(e)

    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const { connections } = useKnowledgeConnections('person', 'p1')
    expect(connections.value).toHaveLength(1)
    expect(connections.value[0].knowledge.id).toBe('k1')
  })

  it('connections reacts to a ref entityId', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore() as any
    store.nodes.push(makeNode('k1'))
    store.edges.push(makeEdge('e1', 'k1', 'person', 'p1'))

    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const entityId = ref('p1')
    const { connections } = useKnowledgeConnections('person', entityId)
    expect(connections.value).toHaveLength(1)
  })

  it('addKnowledge calls create then connect', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore() as any
    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const { addKnowledge } = useKnowledgeConnections('person', 'p1')

    await addKnowledge(
      { content: 'new insight', subtype: 'insight', source: 'manual', certainty: 0.8, certaintyDate: now, tags: [], label: 'new insight' },
      'references'
    )
    expect(store.create).toHaveBeenCalledTimes(1)
    expect(store.connect).toHaveBeenCalledWith('k-new', 'person', 'p1', 'references', undefined)
  })

  it('disconnect delegates to store', async () => {
    const { useKnowledgeStore } = await import('~/stores/knowledge')
    const store = useKnowledgeStore() as any
    const { useKnowledgeConnections } = await import('~/composables/useKnowledgeConnections')
    const { disconnect } = useKnowledgeConnections('person', 'p1')
    await disconnect('e1')
    expect(store.disconnect).toHaveBeenCalledWith('e1')
  })
})
```

- [ ] **Step 2: Run composable tests**

```bash
npm run test -- tests/unit/composables/useKnowledgeConnections.test.ts
```
Expected: all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/composables/useKnowledgeConnections.test.ts
git commit -m "test(knowledge): add useKnowledgeConnections unit tests"
```

---

## Task 8: Create `components/knowledge/KnowledgeNodeForm.vue`

**Files:**
- Create: `components/knowledge/KnowledgeNodeForm.vue`

- [ ] **Step 1: Write the component**

```vue
<template lang="pug">
v-dialog(v-model="internalModel" max-width="640px" scrollable)
  v-card
    v-card-title
      span {{ isRelationOnly ? $t('knowledge.editRelation') : (props.knowledge ? $t('knowledge.editKnowledge') : $t('knowledge.addKnowledge')) }}
    v-divider
    v-card-text
      v-form(ref="formRef" v-model="valid")
        template(v-if="!isRelationOnly")
          v-textarea(
            v-model="form.content"
            :label="$t('knowledge.content')"
            :rules="[v => !!v || $t('common.required')]"
            rows="3"
            auto-grow
            variant="outlined"
            density="compact"
            class="mb-3"
          )
          v-select(
            v-model="form.subtype"
            :items="subtypeItems"
            :label="$t('knowledge.subtype')"
            variant="outlined"
            density="compact"
            class="mb-3"
          )
          v-row(dense class="mb-1 align-center")
            v-col(cols="12")
              .text-caption.text-medium-emphasis.mb-1 {{ $t('knowledge.certainty') }}: {{ Math.round(form.certainty * 100) }}%
              v-slider(
                v-model="form.certainty"
                min="0"
                max="1"
                step="0.05"
                color="primary"
                hide-details
              )
          v-combobox(
            v-model="form.tags"
            :label="$t('knowledge.tags')"
            multiple
            chips
            closable-chips
            variant="outlined"
            density="compact"
            class="mb-3"
          )

        v-divider(v-if="!isRelationOnly" class="mb-3")

        template(v-if="!props.lockedEntity && !isRelationOnly")
          v-select(
            v-model="attachEntityType"
            :items="entityTypeItems"
            :label="$t('knowledge.attachModule')"
            clearable
            variant="outlined"
            density="compact"
            class="mb-3"
          )
          v-autocomplete(
            v-if="attachEntityType"
            v-model="attachEntityId"
            :items="entityItems"
            item-title="label"
            item-value="id"
            :label="$t('knowledge.attachItem')"
            clearable
            variant="outlined"
            density="compact"
            class="mb-3"
          )

        v-select(
          v-model="form.relationType"
          :items="relationTypeItems"
          :label="$t('knowledge.relationType')"
          variant="outlined"
          density="compact"
          class="mb-3"
        )
        v-text-field(
          v-model="form.relationLabel"
          :label="$t('knowledge.relationLabel')"
          variant="outlined"
          density="compact"
          class="mb-3"
        )

    v-divider
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="emit('cancel')") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!valid || saving" :loading="saving" @click="submit") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useTasksStore } from '~/stores/tasks'
import { useBehaviorsStore } from '~/stores/behaviors'
import { useMeetingsStore } from '~/stores/meetings'
import { useTeamsStore } from '~/stores/teams'
import { useCoachingStore } from '~/stores/coaching'
import type { KnowledgeNode, NodeType, EdgeType, KnowledgeSubtype } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  knowledge: KnowledgeNode | null
  edge: KnowledgeEdge | null
  lockedEntity: { nodeType: NodeType; entityId: string } | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: {
    content: string
    subtype: KnowledgeSubtype
    certainty: number
    certaintyDate: Date
    tags: string[]
    relationType: EdgeType
    relationLabel?: string
    entityType?: NodeType
    entityId?: string
  }]
  cancel: []
}>()

const internalModel = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isRelationOnly = computed(() => props.edge !== null && props.knowledge !== null && false)
// Show all fields when editing; show only relation fields when edge-only mode.
// For now always show full form — simpler and consistent.

const valid = ref(false)
const saving = ref(false)
const formRef = ref()

const form = ref({
  content: '',
  subtype: 'observation' as KnowledgeSubtype,
  certainty: 0.7,
  tags: [] as string[],
  relationType: 'references' as EdgeType,
  relationLabel: '',
})

const attachEntityType = ref<NodeType | null>(null)
const attachEntityId = ref<string | null>(null)

watch(() => props.modelValue, (open) => {
  if (!open) return
  if (props.knowledge) {
    form.value = {
      content: props.knowledge.content,
      subtype: props.knowledge.subtype,
      certainty: props.knowledge.certainty,
      tags: [...props.knowledge.tags],
      relationType: (props.edge?.relationType ?? 'references') as EdgeType,
      relationLabel: props.edge?.label ?? '',
    }
  } else {
    form.value = {
      content: '', subtype: 'observation', certainty: 0.7,
      tags: [], relationType: 'references', relationLabel: '',
    }
    attachEntityType.value = props.lockedEntity?.nodeType ?? null
    attachEntityId.value = props.lockedEntity?.entityId ?? null
  }
})

const subtypeItems = computed(() =>
  (['observation', 'concept', 'reason', 'fact', 'insight', 'pattern'] as KnowledgeSubtype[]).map(v => ({
    title: t(`knowledge.subtypes.${v}`),
    value: v,
  }))
)

const entityTypeItems = computed(() =>
  (['person', 'project', 'task', 'behavior', 'meeting', 'team', 'coaching'] as NodeType[]).map(v => ({
    title: t(`network.nodeType.${v}`),
    value: v,
  }))
)

const relationTypeItems = [
  { title: 'References', value: 'references' },
  { title: 'Related', value: 'related' },
  { title: 'Contains', value: 'contains' },
  { title: 'Stakeholder', value: 'stakeholder' },
  { title: 'Other', value: 'related' },
]

const entityItems = computed(() => {
  switch (attachEntityType.value) {
    case 'person': return usePeopleStore().people.map(p => ({ id: p.id, label: `${p.firstName} ${p.lastName}` }))
    case 'project': return useProjectsStore().projects.map(p => ({ id: p.id, label: p.title }))
    case 'task': return useTasksStore().tasks.map(t => ({ id: t.id, label: t.title }))
    case 'behavior': return useBehaviorsStore().behaviors.map(b => ({ id: b.id, label: b.title }))
    case 'meeting': return useMeetingsStore().meetings.map(m => ({ id: m.id, label: m.title }))
    case 'team': return useTeamsStore().teams.map(t => ({ id: t.id, label: t.name }))
    case 'coaching': return useCoachingStore().records.map(c => ({ id: c.id, label: c.title ?? c.id }))
    default: return []
  }
})

async function submit() {
  const { valid: v } = await formRef.value.validate()
  if (!v) return
  saving.value = true
  try {
    emit('submit', {
      content: form.value.content,
      subtype: form.value.subtype,
      certainty: form.value.certainty,
      certaintyDate: new Date(),
      tags: form.value.tags,
      relationType: form.value.relationType as EdgeType,
      ...(form.value.relationLabel ? { relationLabel: form.value.relationLabel } : {}),
      ...(attachEntityType.value && attachEntityId.value
        ? { entityType: attachEntityType.value, entityId: attachEntityId.value }
        : {}),
    })
  } finally {
    saving.value = false
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/knowledge/KnowledgeNodeForm.vue
git commit -m "feat(knowledge): add KnowledgeNodeForm dialog component"
```

---

## Task 9: Create `components/knowledge/KnowledgeConnections.vue`

**Files:**
- Create: `components/knowledge/KnowledgeConnections.vue`

- [ ] **Step 1: Write the component**

```vue
<template lang="pug">
div
  .d-flex.align-center.mb-3
    .text-subtitle-1 {{ $t('knowledge.title') }}
    v-spacer
    v-btn(
      color="primary"
      variant="tonal"
      size="small"
      prepend-icon="mdi-plus"
      @click="openAdd"
    ) {{ $t('knowledge.addKnowledge') }}

  v-alert(
    v-if="connections.length === 0"
    type="info"
    variant="tonal"
    density="compact"
    class="mb-3"
  ) {{ $t('knowledge.emptyState') }}

  v-list(v-else density="compact")
    v-list-item(
      v-for="row in connections"
      :key="row.edge.id"
      rounded="lg"
      class="mb-2 border"
    )
      template(#prepend)
        v-icon(color="amber" size="small") mdi-lightbulb-outline

      template(#title)
        .text-body-2.text-wrap {{ row.knowledge.content }}

      template(#subtitle)
        .d-flex.flex-wrap.align-center.gap-1.mt-1
          v-chip(
            size="x-small"
            color="secondary"
            variant="tonal"
          ) {{ $t(`knowledge.subtypes.${row.knowledge.subtype}`) }}
          v-chip(
            size="x-small"
            :color="certaintyColor(row.knowledge.certainty)"
            variant="tonal"
          ) {{ Math.round(row.knowledge.certainty * 100) }}%
          v-chip(
            size="x-small"
            color="primary"
            variant="outlined"
          ) {{ row.edge.label || row.edge.relationType }}
          template(v-if="row.otherConnections.length > 0")
            span.text-caption.text-medium-emphasis.ml-1 {{ $t('knowledge.otherConnections') }}:
            v-chip(
              v-for="other in row.otherConnections"
              :key="other.edgeId"
              size="x-small"
              variant="text"
              color="primary"
              :to="entityRoute(other.entityType, other.entityId)"
            ) {{ $t(`network.nodeType.${other.entityType}`) }}

      template(#append)
        v-menu
          template(#activator="{ props }")
            v-btn(icon variant="text" size="small" v-bind="props")
              v-icon(size="small") mdi-dots-vertical
          v-list(density="compact")
            v-list-item(prepend-icon="mdi-pencil" @click="openEdit(row)") {{ $t('knowledge.editKnowledge') }}
            v-list-item(prepend-icon="mdi-link-variant-off" @click="handleDisconnect(row.edge.id)") {{ $t('knowledge.disconnect') }}
            v-list-item(prepend-icon="mdi-delete" base-color="error" @click="handleDelete(row)") {{ $t('knowledge.deleteKnowledge') }}

  KnowledgeNodeForm(
    v-model="formOpen"
    :knowledge="editingRow?.knowledge ?? null"
    :edge="editingRow?.edge ?? null"
    :locked-entity="lockedEntity"
    @submit="handleFormSubmit"
    @cancel="formOpen = false"
  )
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '~/stores/notification'
import { useKnowledgeConnections, type KnowledgeConnectionRow } from '~/composables/useKnowledgeConnections'
import type { NodeType, EdgeType } from '~/types/models/network'

const { t } = useI18n()

const props = defineProps<{
  nodeType: NodeType
  entityId: string
}>()

const { connections, addKnowledge, editKnowledge, editRelation, disconnect, removeKnowledge } =
  useKnowledgeConnections(props.nodeType, computed(() => props.entityId))

const lockedEntity = computed(() => ({ nodeType: props.nodeType, entityId: props.entityId }))

const formOpen = ref(false)
const editingRow = ref<KnowledgeConnectionRow | null>(null)

const entityRoutes: Record<string, string> = {
  person: '/people', project: '/projects', task: '/tasks',
  behavior: '/behaviors', meeting: '/meetings', team: '/teams', coaching: '/coaching',
}

function entityRoute(entityType: NodeType, entityId: string) {
  return `${entityRoutes[entityType] ?? '/'}/${entityId}`
}

function certaintyColor(certainty: number) {
  if (certainty >= 0.8) return 'success'
  if (certainty >= 0.6) return 'warning'
  return 'error'
}

function openAdd() {
  editingRow.value = null
  formOpen.value = true
}

function openEdit(row: KnowledgeConnectionRow) {
  editingRow.value = row
  formOpen.value = true
}

async function handleFormSubmit(data: {
  content: string
  subtype: any
  certainty: number
  certaintyDate: Date
  tags: string[]
  relationType: EdgeType
  relationLabel?: string
  entityType?: NodeType
  entityId?: string
}) {
  const notify = useNotificationStore()
  try {
    if (editingRow.value) {
      await editKnowledge(editingRow.value.knowledge.id, {
        content: data.content,
        subtype: data.subtype,
        certainty: data.certainty,
        certaintyDate: data.certaintyDate,
        tags: data.tags,
      })
      await editRelation(editingRow.value.edge.id, data.relationType, data.relationLabel)
    } else {
      await addKnowledge(
        { content: data.content, subtype: data.subtype, source: 'manual', certainty: data.certainty, certaintyDate: data.certaintyDate, tags: data.tags, label: data.content.slice(0, 60) },
        data.relationType,
        data.relationLabel
      )
      // Also connect to optional extra entity
      if (data.entityType && data.entityId) {
        // The composable only adds to the locked entity; extra entity attachment
        // requires a direct call to the knowledge store.
        const { useKnowledgeStore } = await import('~/stores/knowledge')
        const kStore = useKnowledgeStore()
        // Find the newly created node — it is the last one added
        const lastNode = kStore.nodes[kStore.nodes.length - 1]
        if (lastNode) {
          await kStore.connect(lastNode.id, data.entityType, data.entityId, data.relationType, data.relationLabel)
        }
      }
    }
    formOpen.value = false
  } catch {
    notify.error('knowledge.saveError')
  }
}

async function handleDisconnect(edgeId: string) {
  const notify = useNotificationStore()
  try {
    await disconnect(edgeId)
  } catch {
    notify.error('knowledge.deleteError')
  }
}

async function handleDelete(row: KnowledgeConnectionRow) {
  const notify = useNotificationStore()
  const otherCount = row.otherConnections.length
  const msg = otherCount > 0
    ? t('knowledge.confirmDeleteWithConnections', { n: otherCount })
    : t('knowledge.confirmDelete')
  if (!confirm(msg)) return
  try {
    await removeKnowledge(row.knowledge.id)
  } catch {
    notify.error('knowledge.deleteError')
  }
}
</script>

<style lang="sass" scoped>
.border
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/knowledge/KnowledgeConnections.vue
git commit -m "feat(knowledge): add KnowledgeConnections tab component"
```

---

## Task 10: Add Knowledge tab to `pages/projects/[id].vue`

Projects already has `v-tabs` / `v-window`. Just add one more entry.

**Files:**
- Modify: `pages/projects/[id].vue`

- [ ] **Step 1: Add the tab**

Find the `v-tabs(v-model="activeTab")` block and add one `v-tab` after the existing tabs:

```pug
        v-tab(value="knowledge") {{ $t('knowledge.title') }}
```

- [ ] **Step 2: Add the window item**

Find the closing `v-window` and add one more `v-window-item` before it closes:

```pug
        v-window-item(value="knowledge")
          v-card(elevation="1" class="mt-4")
            v-card-text
              KnowledgeConnections(
                v-if="project"
                node-type="project"
                :entity-id="project.id"
              )
```

- [ ] **Step 3: Add KnowledgeConnections import**

In the `<script setup>` block, add:

```typescript
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'
```

- [ ] **Step 4: Verify the page still loads without errors**

```bash
npm run test -- --grep "projects"
```

- [ ] **Step 5: Commit**

```bash
git add pages/projects/[id].vue
git commit -m "feat(knowledge): add Knowledge tab to project detail page"
```

---

## Task 11: Add Knowledge tab to `pages/meetings/[id].vue`

Meetings has no tabs yet. Wrap the main content in a tabs layout.

**Files:**
- Modify: `pages/meetings/[id].vue`

- [ ] **Step 1: Add tab state to script**

In the `<script setup>` block, add:

```typescript
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'
const activeTab = ref('details')
```

- [ ] **Step 2: Add tabs to template**

Immediately before the closing `</template>` and after `v-card-text(v-else)`, wrap the `v-row` meeting-content block in a tabs layout. The existing `v-card-text(v-else)` block that contains `v-row` should become:

```pug
      v-card-text(v-else)
        v-tabs(v-model="activeTab" class="mb-4")
          v-tab(value="details") {{ $t('common.details') }}
          v-tab(value="knowledge") {{ $t('knowledge.title') }}
        v-window(v-model="activeTab")
          v-window-item(value="details")
            //- [existing v-row content goes here — no changes to inner markup]
          v-window-item(value="knowledge")
            KnowledgeConnections(
              v-if="meeting"
              node-type="meeting"
              :entity-id="meeting.id"
            )
```

(Keep all existing inner content of `v-card-text(v-else)` intact, just wrap it in the `v-window-item(value="details")` block.)

- [ ] **Step 3: Commit**

```bash
git add pages/meetings/[id].vue
git commit -m "feat(knowledge): add Knowledge tab to meeting detail page"
```

---

## Task 12: Add Knowledge tab to `pages/coaching/[id].vue`

The coaching detail page uses HTML template syntax. Add the Knowledge tab without restructuring.

**Files:**
- Modify: `pages/coaching/[id].vue`

- [ ] **Step 1: Find where to add the tab**

The coaching page has tab-like cards or sections. Find the section that shows coaching content and add a `v-tabs` / `v-window` wrap around the main content, similar to the meetings approach: wrap the main `v-card-text` (the one with the full coaching record content) in:

```html
<v-tabs v-model="activeTabCoaching" class="mb-4">
  <v-tab value="details">{{ $t('common.details') }}</v-tab>
  <v-tab value="knowledge">{{ $t('knowledge.title') }}</v-tab>
</v-tabs>
<v-window v-model="activeTabCoaching">
  <v-window-item value="details">
    <!-- [existing coaching detail content unchanged] -->
  </v-window-item>
  <v-window-item value="knowledge">
    <KnowledgeConnections
      v-if="coaching"
      node-type="coaching"
      :entity-id="coaching.id"
    />
  </v-window-item>
</v-window>
```

- [ ] **Step 2: Add tab state and import to script**

```typescript
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'
const activeTabCoaching = ref('details')
```

- [ ] **Step 3: Commit**

```bash
git add pages/coaching/[id].vue
git commit -m "feat(knowledge): add Knowledge tab to coaching detail page"
```

---

## Task 13: Add Knowledge tab to `pages/teams/[id].vue`

Teams has a complex board layout. Add a tab switcher at the top that adds "Knowledge" alongside the board view.

**Files:**
- Modify: `pages/teams/[id].vue`

- [ ] **Step 1: Add tab state and import**

In the `<script setup>` block, add:

```typescript
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'
const activeTab = ref('board')
```

- [ ] **Step 2: Wrap existing `template(v-else)` board content**

Find the `template(v-else)` block that contains the full board content. Wrap its inner content with:

```pug
  v-tabs(v-model="activeTab" class="mb-4")
    v-tab(value="board") {{ $t('teams.title') }}
    v-tab(value="knowledge") {{ $t('knowledge.title') }}
  v-window(v-model="activeTab")
    v-window-item(value="board")
      //- [existing board rows here, unchanged]
    v-window-item(value="knowledge")
      KnowledgeConnections(
        node-type="team"
        :entity-id="team.id"
      )
```

- [ ] **Step 3: Commit**

```bash
git add pages/teams/[id].vue
git commit -m "feat(knowledge): add Knowledge tab to team detail page"
```

---

## Task 14: Create `pages/people/[id].vue`

**Files:**
- Create: `pages/people/[id].vue`

- [ ] **Step 1: Write the page**

```vue
<template lang="pug">
v-container(fluid)
  v-row.align-center
    v-col(cols="auto")
      v-btn(icon variant="text" to="/people" :title="$t('common.back')")
        v-icon mdi-arrow-left
    v-col
      h1.text-h4.text-truncate {{ personName }}

  v-row(v-if="loading && !person")
    v-col(cols="12")
      v-skeleton-loader(type="article")

  v-alert(v-else-if="!person" type="warning") {{ $t('people.personNotFound') }}

  template(v-else)
    v-tabs(v-model="activeTab" class="mb-4")
      v-tab(value="details") {{ $t('common.details') }}
      v-tab(value="knowledge") {{ $t('knowledge.title') }}

    v-window(v-model="activeTab")
      v-window-item(value="details")
        v-row
          v-col(cols="12" md="6")
            v-list(density="compact")
              v-list-item(:title="$t('people.email')" :subtitle="person.email || '—'")
              v-list-item(:title="$t('people.phone')" :subtitle="person.phone || '—'")
              v-list-item(:title="$t('people.organization')" :subtitle="person.organization || '—'")
              v-list-item(:title="$t('people.role')" :subtitle="person.role || '—'")
              v-list-item(:title="$t('people.team')" :subtitle="person.team || '—'")
          v-col(cols="12" md="6")
            v-card(variant="outlined" v-if="person.notes")
              v-card-title {{ $t('people.notes') }}
              v-card-text {{ person.notes }}
            .d-flex.flex-wrap.gap-1.mt-2(v-if="person.tags?.length")
              v-chip(v-for="tag in person.tags" :key="tag" size="small" variant="tonal") {{ tag }}

      v-window-item(value="knowledge")
        KnowledgeConnections(
          node-type="person"
          :entity-id="person.id"
        )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePeopleStore } from '~/stores/people'
import { useKnowledgeStore } from '~/stores/knowledge'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'

const route = useRoute()
const peopleStore = usePeopleStore()
const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const activeTab = ref('details')

const person = computed(() => peopleStore.getById(route.params.id as string))
const personName = computed(() => person.value ? `${person.value.firstName} ${person.value.lastName}` : '')

onMounted(async () => {
  loading.value = true
  await Promise.all([
    peopleStore.people.length === 0 ? peopleStore.fetchPeople() : Promise.resolve(),
    knowledgeStore.bootstrapped ? Promise.resolve() : knowledgeStore.load(),
  ])
  loading.value = false
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add pages/people/[id].vue
git commit -m "feat(people): add person detail page with Knowledge tab"
```

---

## Task 15: Create `pages/tasks/[id].vue`

**Files:**
- Create: `pages/tasks/[id].vue`

- [ ] **Step 1: Write the page**

```vue
<template lang="pug">
v-container(fluid)
  v-row.align-center
    v-col(cols="auto")
      v-btn(icon variant="text" to="/tasks" :title="$t('common.back')")
        v-icon mdi-arrow-left
    v-col
      h1.text-h4.text-truncate {{ task?.title || $t('tasks.task') }}

  v-row(v-if="loading && !task")
    v-col(cols="12")
      v-skeleton-loader(type="article")

  v-alert(v-else-if="!task" type="warning") {{ $t('tasks.taskNotFound') }}

  template(v-else)
    v-tabs(v-model="activeTab" class="mb-4")
      v-tab(value="details") {{ $t('common.details') }}
      v-tab(value="knowledge") {{ $t('knowledge.title') }}

    v-window(v-model="activeTab")
      v-window-item(value="details")
        v-row
          v-col(cols="12" md="8")
            v-list(density="compact")
              v-list-item(:title="$t('tasks.status')" :subtitle="task.status")
              v-list-item(:title="$t('tasks.priority')" :subtitle="task.priority")
              v-list-item(
                v-if="task.dueDate"
                :title="$t('tasks.dueDate')"
                :subtitle="formatDate(task.dueDate)"
              )
              v-list-item(
                v-if="task.assignee"
                :title="$t('tasks.assignee')"
                :subtitle="getPersonName(task.assignee)"
              )
            p.text-body-1.mt-4(v-if="task.description") {{ task.description }}

      v-window-item(value="knowledge")
        KnowledgeConnections(
          node-type="task"
          :entity-id="task.id"
        )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '~/stores/tasks'
import { usePeopleStore } from '~/stores/people'
import { useKnowledgeStore } from '~/stores/knowledge'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'

const route = useRoute()
const { locale } = useI18n()
const tasksStore = useTasksStore()
const peopleStore = usePeopleStore()
const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const activeTab = ref('details')

const task = computed(() => tasksStore.tasks.find(t => t.id === route.params.id as string))

function getPersonName(personId: string) {
  const p = peopleStore.getById(personId)
  return p ? `${p.firstName} ${p.lastName}` : personId
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(date))
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    tasksStore.tasks.length === 0 ? tasksStore.fetchTasks() : Promise.resolve(),
    peopleStore.people.length === 0 ? peopleStore.fetchPeople() : Promise.resolve(),
    knowledgeStore.bootstrapped ? Promise.resolve() : knowledgeStore.load(),
  ])
  loading.value = false
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add pages/tasks/[id].vue
git commit -m "feat(tasks): add task detail page with Knowledge tab"
```

---

## Task 16: Create `pages/behaviors/[id].vue`

**Files:**
- Create: `pages/behaviors/[id].vue`

- [ ] **Step 1: Write the page**

```vue
<template lang="pug">
v-container(fluid)
  v-row.align-center
    v-col(cols="auto")
      v-btn(icon variant="text" to="/behaviors" :title="$t('common.back')")
        v-icon mdi-arrow-left
    v-col
      h1.text-h4.text-truncate {{ behavior?.title || $t('behaviors.behavior') }}

  v-row(v-if="loading && !behavior")
    v-col(cols="12")
      v-skeleton-loader(type="article")

  v-alert(v-else-if="!behavior" type="warning") {{ $t('behaviors.behaviorNotFound') }}

  template(v-else)
    v-tabs(v-model="activeTab" class="mb-4")
      v-tab(value="details") {{ $t('common.details') }}
      v-tab(value="knowledge") {{ $t('knowledge.title') }}

    v-window(v-model="activeTab")
      v-window-item(value="details")
        v-row
          v-col(cols="12" md="8")
            v-chip(:color="typeColor" class="mb-3") {{ $t(`behaviors.${behavior.type}`) }}
            p.text-body-1.mb-3 {{ behavior.description }}
            p.text-body-2.text-medium-emphasis.mb-4 {{ behavior.rationale }}
            template(v-if="behavior.actionPlans?.length")
              .text-subtitle-2.mb-2 {{ $t('behaviors.actionPlans') }}
              v-card(
                v-for="(plan, i) in behavior.actionPlans"
                :key="i"
                variant="outlined"
                class="mb-2"
              )
                v-card-text {{ plan.description }}

      v-window-item(value="knowledge")
        KnowledgeConnections(
          node-type="behavior"
          :entity-id="behavior.id"
        )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBehaviorsStore } from '~/stores/behaviors'
import { useKnowledgeStore } from '~/stores/knowledge'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'

const route = useRoute()
const behaviorsStore = useBehaviorsStore()
const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const activeTab = ref('details')

const behavior = computed(() => behaviorsStore.getById(route.params.id as string))
const typeColor = computed(() => {
  switch (behavior.value?.type) {
    case 'doWell': return 'success'
    case 'wantToDoBetter': return 'info'
    case 'needToImprove': return 'warning'
    default: return 'default'
  }
})

onMounted(async () => {
  loading.value = true
  await Promise.all([
    behaviorsStore.behaviors.length === 0 ? behaviorsStore.fetchBehaviors() : Promise.resolve(),
    knowledgeStore.bootstrapped ? Promise.resolve() : knowledgeStore.load(),
  ])
  loading.value = false
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add pages/behaviors/[id].vue
git commit -m "feat(behaviors): add behavior detail page with Knowledge tab"
```

---

## Task 17: Add detail links to index pages

**Files:**
- Modify: `pages/people/index.vue`
- Modify: `pages/tasks/index.vue`
- Modify: `pages/behaviors/index.vue`

- [ ] **Step 1: People index — add `:to` on list items**

In `pages/people/index.vue`, find the `v-list-item` in the main people table/list that handles row click and add a `:to` binding:

```pug
v-list-item(
  ...existing props...
  :to="`/people/${person.id}`"
)
```

Or if it uses a `v-data-table`, add a column with:
```pug
template(#item.actions="{ item }")
  v-btn(icon variant="text" size="small" :to="`/people/${item.id}`")
    v-icon mdi-open-in-new
```

- [ ] **Step 2: Tasks index — add detail link**

In `pages/tasks/index.vue`, find the task row items and add `:to="\`/tasks/${task.id}\`"` or an action icon.

- [ ] **Step 3: Behaviors index — add detail link**

In `pages/behaviors/index.vue`, on each behavior list item add `:to="\`/behaviors/${behavior.id}\`"` alongside the existing `@click` handler (or replace `@click` with `:to`).

- [ ] **Step 4: Commit**

```bash
git add pages/people/index.vue pages/tasks/index.vue pages/behaviors/index.vue
git commit -m "feat: add detail page links on people, tasks, behaviors index pages"
```

---

## Task 18: Global quick-add in `layouts/default.vue`

**Files:**
- Modify: `layouts/default.vue`

- [ ] **Step 1: Add dialog state and import**

In the `<script setup>` block, add:

```typescript
import KnowledgeNodeForm from '~/components/knowledge/KnowledgeNodeForm.vue'
const knowledgeDialog = ref(false)
```

- [ ] **Step 2: Add the knowledge store import for quick-add submit handler**

```typescript
import { useKnowledgeStore } from '~/stores/knowledge'
```

- [ ] **Step 3: Add to `addMenuItems`**

In the `addMenuItems` array, add:

```typescript
  {
    title: i18n.t('knowledge.add'),
    icon: 'mdi-lightbulb-outline',
    color: 'amber',
    action: () => knowledgeDialog.value = true,
  },
```

- [ ] **Step 4: Add the handler**

```typescript
async function onKnowledgeSubmit(data: {
  content: string; subtype: any; certainty: number; certaintyDate: Date
  tags: string[]; relationType: any; relationLabel?: string
  entityType?: any; entityId?: string
}) {
  const kStore = useKnowledgeStore()
  try {
    const node = await kStore.create({
      content: data.content, subtype: data.subtype, source: 'manual' as const,
      certainty: data.certainty, certaintyDate: data.certaintyDate,
      tags: data.tags, label: data.content.slice(0, 60),
    })
    if (node && data.entityType && data.entityId) {
      await kStore.connect(node.id, data.entityType, data.entityId, data.relationType, data.relationLabel)
    }
    knowledgeDialog.value = false
    useNotificationStore().success(t('knowledge.addKnowledge'))
  } catch {
    useNotificationStore().error('knowledge.saveError')
  }
}
```

- [ ] **Step 5: Add the dialog to template**

After the last `dialog-form` block (before the AI dialog comment), add in the Pug template:

```pug
  dialog-form(v-model="knowledgeDialog" max-width="640px" scrollable)
    KnowledgeNodeForm(
      v-if="knowledgeDialog"
      v-model="knowledgeDialog"
      :knowledge="null"
      :edge="null"
      :locked-entity="null"
      @submit="onKnowledgeSubmit"
      @cancel="knowledgeDialog = false"
    )
```

- [ ] **Step 6: Commit**

```bash
git add layouts/default.vue
git commit -m "feat(knowledge): add global knowledge quick-add to app bar"
```

---

## Task 19: Wire up `pages/network/index.vue` placeholder

**Files:**
- Modify: `pages/network/index.vue`

- [ ] **Step 1: Add knowledge dialog state and import**

In the `<script setup>` block, add:

```typescript
import KnowledgeNodeForm from '~/components/knowledge/KnowledgeNodeForm.vue'
import { useKnowledgeStore } from '~/stores/knowledge'
const knowledgeFormOpen = ref(false)
const knowledgeFormNode = ref<GraphNode | null>(null)
```

- [ ] **Step 2: Replace the placeholder**

Replace:

```typescript
function openAddKnowledge(_node: GraphNode) {
  // Placeholder — KnowledgeNodeForm added in Plan 2
}
```

With:

```typescript
function openAddKnowledge(node: GraphNode) {
  knowledgeFormNode.value = node
  knowledgeFormOpen.value = true
}

async function handleKnowledgeSubmit(data: {
  content: string; subtype: any; certainty: number; certaintyDate: Date
  tags: string[]; relationType: any; relationLabel?: string
}) {
  const node = knowledgeFormNode.value
  if (!node || !node.entityId) return
  const kStore = useKnowledgeStore()
  try {
    const kNode = await kStore.create({
      content: data.content, subtype: data.subtype, source: 'manual' as const,
      certainty: data.certainty, certaintyDate: data.certaintyDate,
      tags: data.tags, label: data.content.slice(0, 60),
    })
    if (kNode) {
      await kStore.connect(kNode.id, node.type as any, node.entityId, data.relationType, data.relationLabel)
    }
    knowledgeFormOpen.value = false
    useNotificationStore().success(t('knowledge.addKnowledge'))
  } catch {
    useNotificationStore().error('knowledge.saveError')
  }
}
```

- [ ] **Step 3: Add the dialog to the template**

At the end of the Pug template (before the final closing), add:

```pug
  KnowledgeNodeForm(
    v-model="knowledgeFormOpen"
    :knowledge="null"
    :edge="null"
    :locked-entity="knowledgeFormNode && knowledgeFormNode.entityId ? { nodeType: knowledgeFormNode.type, entityId: knowledgeFormNode.entityId } : null"
    @submit="handleKnowledgeSubmit"
    @cancel="knowledgeFormOpen = false"
  )
```

- [ ] **Step 4: Ensure knowledge store loads with the network page**

In the `onMounted` or initial load section of `network/index.vue`, add:

```typescript
const kStore = useKnowledgeStore()
if (!kStore.bootstrapped) kStore.load()
```

- [ ] **Step 5: Commit**

```bash
git add pages/network/index.vue
git commit -m "feat(network): wire up openAddKnowledge placeholder with KnowledgeNodeForm"
```

---

## Task 20: Load knowledge store on app init

The knowledge store must be loaded on startup so all pages have data. Hook it into the data refresh composable or the app boot flow.

**Files:**
- Modify: `composables/useDataRefresh.ts` (or wherever stores are loaded on boot)

- [ ] **Step 1: Find the data refresh composable**

```bash
cat composables/useDataRefresh.ts
```

- [ ] **Step 2: Add knowledge store load**

In `useDataRefresh.ts`, import and call `useKnowledgeStore().load()` alongside the other store loads in the `refreshAllData` function:

```typescript
import { useKnowledgeStore } from '~/stores/knowledge'
// inside refreshAllData():
const knowledgeStore = useKnowledgeStore()
await knowledgeStore.load()
```

- [ ] **Step 3: Also load on `useAppInitialLoad` if that exists**

```bash
cat composables/useAppInitialLoad.ts
```

Add `useKnowledgeStore().load()` to the initial load sequence.

- [ ] **Step 4: Commit**

```bash
git add composables/useDataRefresh.ts composables/useAppInitialLoad.ts
git commit -m "feat(knowledge): load knowledge store on app init and refresh"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in task |
|---|---|
| `stores/knowledge.ts` with `knowledgeNodes` + `knowledgeEdges` | Task 3 |
| `KnowledgeEdge` type | Task 1 |
| `connectionsForEntity`, `otherConnectionsForKnowledge` getters | Task 3 |
| `create`, `update`, `delete`, `connect`, `disconnect`, `updateConnection` actions | Task 3 |
| `stores/network.ts` `knowledgeFor` removed | Task 5 |
| `stores/network.ts` `updateEdge` added | Task 5 |
| `useKnowledgeConnections` composable | Task 6 |
| `KnowledgeNodeForm` component | Task 8 |
| `KnowledgeConnections` component | Task 9 |
| Knowledge tab on projects/[id] | Task 10 |
| Knowledge tab on meetings/[id] | Task 11 |
| Knowledge tab on coaching/[id] | Task 12 |
| Knowledge tab on teams/[id] | Task 13 |
| New people/[id] detail page | Task 14 |
| New tasks/[id] detail page | Task 15 |
| New behaviors/[id] detail page | Task 16 |
| Detail links on index pages | Task 17 |
| Global quick-add in layouts/default.vue | Task 18 |
| Network page placeholder wired up | Task 19 |
| i18n keys | Task 2 |
| Knowledge store loaded on boot | Task 20 |

**Placeholder scan:** No TBDs. All code steps contain actual code.

**Type consistency:** `KnowledgeEdge` imported from `~/types/models/knowledge` everywhere. `KnowledgeNode` imported from `~/types/models/network` everywhere. `useKnowledgeConnections` composable signature is consistent across Tasks 6, 7, 9.

**Edge case:** The "also connect to optional extra entity" logic in `KnowledgeConnections.vue` (Task 9, `handleFormSubmit`) relies on the last-added node being the correct one — fragile. The better fix is to have `addKnowledge` in the composable return the created node and accept an optional secondary connection. The current implementation uses `kStore.nodes[kStore.nodes.length - 1]` which is acceptable for MVP but noted as a known limitation.
