# Network Module — Design Spec
_Date: 2026-04-05_

## Context

The Network module (`/network`) exists but only renders a basic 2D vis-network graph derived at runtime from existing store relationships. It has no dedicated store, no knowledge representation, and the AI providers receive no user context. This redesign makes the network a first-class feature: a 3D interactive graph that is the single source of truth for all entity relationships, supports typed knowledge nodes with certainty scores, feeds context to every AI call across the app, and supports explicit graph querying.

---

## 1. Data Model

### Two new Firestore collections

**`graphNodes`** — one node per entity in the app (synced from existing stores) plus knowledge nodes:

```typescript
interface GraphNode {
  id: string
  userId: string
  type: 'person' | 'project' | 'task' | 'behavior' | 'meeting' | 'team' | 'coaching' | 'knowledge'
  entityId: string | null   // ID in source store; null for knowledge nodes
  label: string
  createdAt: Date
  updatedAt: Date
}
```

**`graphEdges`** — all relationships, authoritative source of truth:

```typescript
interface GraphEdge {
  id: string
  userId: string
  sourceId: string          // GraphNode ID
  targetId: string          // GraphNode ID
  type: string              // 'member' | 'assignee' | 'contains' | 'participant' | 'references' | 'related' | custom
  label?: string
  createdAt: Date
  updatedAt: Date
}
```

**`KnowledgeNode`** extends `GraphNode` (`type: 'knowledge'`, `entityId: null`):

```typescript
interface KnowledgeNode extends GraphNode {
  type: 'knowledge'
  entityId: null
  content: string
  subtype: 'observation' | 'concept' | 'reason' | 'fact' | 'insight' | 'pattern'
  source: 'manual' | 'ai' | 'email' | 'note'
  sourceRef?: string        // e.g. email ID, meeting ID that triggered extraction
  certainty: number         // 0.0–1.0
  certaintyDate: Date       // when this certainty was assessed
  tags: string[]
}
```

### Single source of truth for relationships

Module stores' relationship arrays (e.g. `project.members[]`, `task.assignee`, `meeting.participants[]`) become **computed from graph edges**. The graph store is authoritative. Migration path:

1. `syncFromStores()` runs once on first `networkStore.load()` (guarded by a `graphBootstrapped` flag in Firestore user doc) to ingest existing ID-based relations and create GraphNode + GraphEdge records.
2. After bootstrap, when a module store mutates a relationship (e.g. adding a person to a project), it calls `networkStore.createEdge()` / `networkStore.deleteEdge()` instead of mutating the array directly.
3. Each affected module store adds a getter (e.g. `projectMembers(projectId)`) that reads from `networkStore.edges` filtered by `type: 'member'`.

Affected stores: `people.ts`, `projects.ts`, `tasks.ts`, `meetings.ts`, `behaviors.ts`, `teams.ts`, `coaching.ts`.

### KnowledgeNode links to entities

A knowledge node's connections to entities are stored as regular `GraphEdge` records (`sourceId` = knowledge GraphNode ID, `targetId` = entity GraphNode ID, `type: 'references'`). Multiple edges allowed — one knowledge node can link to several entities (e.g. an observation about a person in the context of a project).

---

## 2. Graph Store (`stores/network.ts`)

```typescript
export const useNetworkStore = defineStore('network', {
  persist: true,
  state: () => ({
    nodes: [] as GraphNode[],
    edges: [] as GraphEdge[],
    loading: false,
  }),
  getters: {
    getNode: (state) => (id: string) => state.nodes.find(n => n.id === id),
    getByEntity: (state) => (type: GraphNode['type'], entityId: string) =>
      state.nodes.find(n => n.type === type && n.entityId === entityId),
    getNeighbours: (state) => (nodeId: string, depth = 2): GraphNode[] => { /* BFS */ },
    getEdgesBetween: (state) => (sourceId: string, targetId: string) => ...,
    shortestPath: (state) => (fromId: string, toId: string): GraphNode[] => { /* BFS */ },
    knowledgeFor: (state) => (nodeId: string, minCertainty = 0.6) =>
      state.edges
        .filter(e => (e.sourceId === nodeId || e.targetId === nodeId))
        .map(e => state.nodes.find(n => n.id === (e.sourceId === nodeId ? e.targetId : e.sourceId)))
        .filter(n => n?.type === 'knowledge' && (n as KnowledgeNode).certainty >= minCertainty),
  },
  actions: {
    async load() { /* fetch graphNodes + graphEdges from Firestore */ },
    async syncFromStores() { /* derive edges from people/projects/tasks/etc., upsert */ },
    async createEdge(edge: Partial<GraphEdge>) { /* addDoc + push */ },
    async deleteEdge(id: string) { /* deleteDoc + filter */ },
    async createKnowledgeNode(node: Partial<KnowledgeNode>) { /* addDoc + push */ },
    async updateKnowledgeNode(id: string, updates: Partial<KnowledgeNode>) { /* updateDoc */ },
    async deleteKnowledgeNode(id: string) { /* deleteDoc + filter */ },
  },
})
```

---

## 3. AI Integration

### Automatic context injection

New utility `utils/buildGraphContext(entityType, entityId, options?)`.  
Requires `networkStore.getByEntity(type, entityId)` getter to resolve the GraphNode ID first:
- Traverses graph store: `getNeighbours(nodeId, depth=2)`
- Appends knowledge nodes with `certainty >= 0.6` (sorted by recency)
- Caps output at ~800 tokens; trims by certainty then recency if over budget
- Returns a compact text block:

```
Graph context for [Person: Alice]:
- Member of: Project Alpha (active), Project Beta (on hold)
- Assigned tasks: 3 open, 1 overdue
- Meetings with: Bob (×4), Carol (×6)
- Knowledge [observation, 90%, 2026-03-01]: "Prefers async communication"
- Knowledge [insight, 70%, 2026-04-01]: "Central connector in Project Alpha network"
```

`BaseAIProvider.analyzeText(text, context?)` gets an optional `context` parameter injected as an additional system message. `server/api/ai/analyze.ts` accepts optional `graphContext` in its Zod-validated request body.

### Explicit graph query (Network module)

`GraphQueryPanel` component:
1. User enters free-text question (optionally scoped to a selected node)
2. Client builds graph context via `buildGraphContext` (full graph or neighbourhood)
3. Posts to `/api/ai/analyze` with question + context
4. Response displayed inline; user can optionally save as a `knowledge` node (`subtype: 'insight'`, `source: 'ai'`, `certainty` editable before saving, default 0.7)

---

## 4. Network Module UI

### Component structure

```
pages/network/index.vue               # Page shell, loads stores, orchestrates panels
components/network/
  NetworkGraph3D.vue                  # 3d-force-graph canvas, emits node-click/node-pin
  NetworkSidebar.vue                  # Left panel: filters, depth, pin list, path finder
  NetworkNodeDetail.vue               # Right panel: selected node info + knowledge list
  KnowledgeNodeForm.vue               # Add/edit knowledge node (overlay)
  GraphQueryPanel.vue                 # "Ask the graph" AI interface
```

Replace `vis-network` with `3d-force-graph` (npm: `3d-force-graph`). Node types map to colours per the Vuetify theme. Knowledge nodes render as diamonds (rotated cubes in 3D), regular nodes as spheres.

### Left sidebar controls

- **Node type toggles** — show/hide each of the 8 node types
- **Graph depth slider** — 1–4 hops from selected/pinned nodes (∞ = full graph, warns on large data)
- **Multi-pin mode** — Ctrl+click pins nodes; graph narrows to pinned nodes + shared neighbourhood; pinned list shown with remove ×
- **Shortest path** — select From + To nodes; highlights path with edge labels
- **Knowledge filter** — min certainty slider + subtype toggles (observation/concept/reason/fact/insight/pattern)
- **Time range** — all time / 30 days / 90 days / custom; filters edges and knowledge by `createdAt`

### Right panel

- Selected node summary (type, label, key stats, "Open record →" link)
- Knowledge nodes attached to selected node (certainty badge, subtype, content, date)
- "Ask AI" input scoped to selected node, with "Global" button to switch to full-graph scope
- "+ Add knowledge" shortcut for the selected node

### Graph canvas behaviours

- Click → select node (show right panel detail)
- Ctrl+click → pin/unpin node
- Double-click → navigate to entity record
- Right-click → context menu (pin, add knowledge, find path from here, open record)
- Node size scales with degree (connection count)
- Cluster halos: dense groups get a translucent background sphere

---

## 5. Knowledge Extraction Workflow

Any module with rich text (meeting notes, project description, coaching record, email body) gets an "Extract knowledge" action:
1. Posts text + entity context to `/api/ai/analyze` with `mode: 'knowledge-extraction'`
2. Server builds graph context for the current entity, injects into system prompt
3. AI returns proposed `KnowledgeNode[]` (content, subtype, certainty, suggested linked entities)
4. User sees a review dialog: confirm/edit each node, adjust certainty, link to entities
5. Confirmed nodes saved via `networkStore.createKnowledgeNode()`

---

## 6. Graph Analytics

Computed in `stores/network.ts` getters, recalculated on graph load:

- **Degree** — edge count per node; drives node size in 3D render
- **Cluster coefficient** — fraction of a node's neighbours that are also connected to each other
- **Orphans** — nodes with degree 0; surfaced as a filter option ("Show unconnected")
- **Community detection** — simple label-propagation to assign cluster IDs; drives halo colour grouping

---

## 7. Additional Features

- **Time travel animation** — scrubbing the time-range slider animates nodes/edges fading in/out chronologically
- **Export** — current filtered subgraph as JSON or PNG (3d-force-graph supports canvas screenshot)

---

## 8. Files to Create / Modify

| Action | Path |
|--------|------|
| Create | `types/models/network.ts` (GraphNode, GraphEdge, KnowledgeNode interfaces) |
| Create | `stores/network.ts` |
| Create | `utils/buildGraphContext.ts` |
| Modify | `utils/api/aiProviders/BaseAIProvider.ts` — add `context?` param to `analyzeText()` |
| Modify | `server/api/ai/analyze.ts` — accept `graphContext?: string` and `mode?: 'analyze' \| 'knowledge-extraction'` in Zod schema |
| Create | `components/network/NetworkGraph3D.vue` |
| Create | `components/network/NetworkSidebar.vue` |
| Create | `components/network/NetworkNodeDetail.vue` |
| Create | `components/network/KnowledgeNodeForm.vue` |
| Create | `components/network/GraphQueryPanel.vue` |
| Rewrite | `pages/network/index.vue` (currently 615 lines, uses vis-network) |
| Modify | Each module store that has relationship arrays — add getters reading from graph store |
| Modify | `locales/en.ts`, `locales/nl.ts` — add network/knowledge i18n keys |
| Create | `tests/unit/stores/network.test.ts` |
| Create | `tests/unit/utils/buildGraphContext.test.ts` |

---

## 9. Verification

1. `make dev` — navigate to `/network`, confirm 3D graph renders with existing people/projects/tasks
2. Add a knowledge node manually → verify it appears as a diamond in the graph linked to the entity
3. Set depth to 1 → verify only direct neighbours shown; set to ∞ → full graph
4. Ctrl+click two nodes → verify multi-pin mode narrows graph to their shared neighbourhood
5. Open a project record, trigger "Extract knowledge" → verify AI proposes nodes, confirm one → verify it appears in network graph
6. Make an AI call from any module (e.g. mail analysis) → verify graph context is included in the request payload
7. Use "Ask the graph" in the Network module → verify answer is grounded in actual graph data, optionally save as insight node
8. `make test` — unit tests for graph store BFS, `buildGraphContext` token budget, KnowledgeNode CRUD
