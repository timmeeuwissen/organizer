# Knowledge Connections — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

## Problem

Knowledge nodes exist in the graph model but have no first-class home outside the Network view. Users cannot add, edit, or remove knowledge connections from within a module's own detail page. The `openAddKnowledge` handler in `network/index.vue` is an unfilled placeholder. Knowledge is currently stored as graph nodes inside the network store, meaning it is tightly coupled to graph infrastructure rather than being a domain of its own.

## Goals

1. Knowledge becomes a self-owned domain (own store, own Firestore collections).
2. Every module detail page surfaces knowledge connections in a dedicated tab.
3. A global quick-add entry lets users create knowledge from anywhere and optionally attach it to any entity.
4. The network view gains a working add-knowledge flow.
5. The network store becomes a consumer of the knowledge store, not an owner of knowledge data.

## Out of scope (future work)

- Migrating entity-to-entity edges (`graphEdges`) to individual domain stores. The network store currently materialises these from `syncFromStores()`; that refactor makes the network store a pure read-only aggregation layer. Noted as the natural next step.

---

## Architecture

### Firestore collections (new)

| Collection | Owner | Contents |
|---|---|---|
| `knowledgeNodes` | `stores/knowledge.ts` | `KnowledgeNode` documents |
| `knowledgeEdges` | `stores/knowledge.ts` | Connection records between a knowledge node and an entity |

`graphNodes` continues to hold entity nodes (person, project, task, etc.). Knowledge nodes are no longer stored there.

### `KnowledgeEdge` type (new, in `types/models/network.ts`)

```ts
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

---

## Store layer

### `stores/knowledge.ts` (new)

**State:** `nodes: KnowledgeNode[]`, `edges: KnowledgeEdge[]`, `loading: boolean`, `bootstrapped: boolean`

**Actions:**

| Action | Description |
|---|---|
| `load()` | Fetches `knowledgeNodes` and `knowledgeEdges` for the current user |
| `create(partial)` | Writes a new `KnowledgeNode` to Firestore; pushes to local state |
| `update(id, partial)` | `updateDoc` on content/subtype/certainty/certaintyDate/tags/label; merges into local state |
| `delete(id)` | Deletes the node document + all `knowledgeEdges` where `knowledgeNodeId === id`; removes from local state |
| `connect(knowledgeId, entityType, entityId, relationType, label?)` | Creates a new `KnowledgeEdge` |
| `disconnect(edgeId)` | Deletes just the edge |
| `updateConnection(edgeId, relationType, label?)` | Updates relation type/label on an edge |

**Getters:**

| Getter | Returns |
|---|---|
| `connectionsForEntity(entityType, entityId)` | `Array<{ knowledge: KnowledgeNode, edge: KnowledgeEdge }>` |
| `otherConnectionsForKnowledge(knowledgeNodeId, excludeEdgeId)` | All other edges for a knowledge node (used to show cross-entity links) |

### `stores/network.ts` (updated)

- `load()` no longer needs to merge knowledge nodes into `this.nodes`; knowledge nodes are provided by the knowledge store when the graph needs them.
- `knowledgeFor(nodeId)` getter is removed; callers use `useKnowledgeStore().connectionsForEntity(type, entityId)` directly.
- `syncFromStores()` unchanged (still materialises entity-to-entity edges).
- New action: `updateEdge(id, partial: Partial<Pick<GraphEdge, 'type' | 'label'>>)` — updates an entity-to-entity edge.

---

## Composable

### `composables/useKnowledgeConnections.ts`

```ts
useKnowledgeConnections(nodeType: NodeType, entityId: Ref<string> | string)
```

Returns:

| Name | Type | Description |
|---|---|---|
| `connections` | `ComputedRef<ConnectionRow[]>` | Each row: `{ knowledge, edge, otherConnections }` |
| `addKnowledge(nodeData, relationType, label?)` | async fn | Creates node then connects it |
| `editKnowledge(id, partial)` | async fn | Updates the knowledge node |
| `editRelation(edgeId, relationType, label?)` | async fn | Updates edge type/label |
| `disconnect(edgeId)` | async fn | Removes just the edge |
| `removeKnowledge(nodeId)` | async fn | Removes node + all its edges |

`ConnectionRow`:
```ts
{
  knowledge: KnowledgeNode
  edge: KnowledgeEdge
  otherConnections: Array<{ entityType: NodeType; entityId: string; relationType: EdgeType; label?: string }>
}
```

---

## Components

### `components/knowledge/KnowledgeNodeForm.vue`

A dialog form for creating and editing knowledge nodes, optionally with an entity attachment.

**Props:**
- `modelValue: boolean` — dialog open/close
- `knowledge: KnowledgeNode | null` — null = add mode, populated = edit mode
- `edge: KnowledgeEdge | null` — null = add mode, populated = edit relation mode
- `lockedEntity: { nodeType: NodeType; entityId: string } | null` — if set, entity selector is pre-filled and read-only (used when opened from a detail page tab)

**Fields:**
- Content (textarea, required)
- Subtype (select: observation / concept / reason / fact / insight / pattern)
- Certainty (slider 0.0–1.0, shown as percentage)
- Tags (chip input)
- Entity attachment group (optional in quick-add; hidden/locked in tab context):
  - Module selector (people / projects / tasks / meetings / behaviors / teams / coaching)
  - Item picker (searchable autocomplete filtered to the selected module)
- Relation type (select from EdgeType values)
- Relation label (optional text)

**Emits:** `submit`, `cancel`

### `components/knowledge/KnowledgeConnections.vue`

The tab-content component, dropped into any detail page.

**Props:** `nodeType: NodeType`, `entityId: string`

**Behaviour:**
- Uses `useKnowledgeConnections` composable.
- Each knowledge row displays:
  - Content (truncated, expandable)
  - Subtype chip + certainty chip (colour-coded: green ≥ 0.8, amber ≥ 0.6, red < 0.6)
  - Relation type/label badge showing the connection to this entity
  - Small chips for other entities connected to the same knowledge node — each links to that entity's detail page
- Row actions: edit knowledge, edit relation, disconnect (remove edge only), delete (remove node + all edges)
- Empty state with prominent "Add knowledge" CTA
- "Add knowledge" button at top right
- Opens `KnowledgeNodeForm` for add/edit

---

## Detail pages

### Existing detail pages — tab addition

Each of the following gets a `v-tabs` layout wrapping existing content in a "Details" tab, with a "Knowledge" tab added:

- `pages/projects/[id].vue`
- `pages/meetings/[id].vue`
- `pages/coaching/[id].vue`
- `pages/teams/[id].vue`

### New detail pages

Minimal `[id].vue` pages created for modules that currently only have index pages:

- `pages/people/[id].vue` — shows name, contact info, roles; + Knowledge tab
- `pages/tasks/[id].vue` — shows title, status, assignee, due date; + Knowledge tab
- `pages/behaviors/[id].vue` — shows title, description, action plans; + Knowledge tab

Each new detail page follows the same structure as `pages/meetings/[id].vue` (Pug template, `v-tabs` layout, fetches from the relevant store by route param `id`).

The index pages for people, tasks, and behaviors gain a row-level "view detail" action (pencil/open icon) linking to the new detail page.

---

## Global quick-add

`layouts/default.vue` additions:

- New `knowledgeDialog` ref and `onKnowledgeSubmit` handler following the existing dialog pattern.
- New entry in `addMenuItems`: `{ title: t('knowledge.add'), icon: 'mdi-lightbulb-outline', color: 'amber', action: () => knowledgeDialog.value = true }`
- New global dialog: `dialog-form(v-model="knowledgeDialog")` hosting `KnowledgeNodeForm` with `lockedEntity: null` (free-form, entity attachment optional).

---

## Network page fix

`pages/network/index.vue`:

- `openAddKnowledge(node: GraphNode)` wired up: opens `KnowledgeNodeForm` with `lockedEntity` set from the node's `type` and `entityId`.
- After submit, calls `useKnowledgeStore().create()` + `connect()`.
- The 3D graph visualization (`NetworkGraph3D.vue`) updated to also render knowledge nodes sourced from the knowledge store (alongside entity nodes from the network store).

---

## i18n additions

New keys added to `locales/en.ts` and `locales/nl.ts` under `knowledge.*`:

```
knowledge.add
knowledge.addKnowledge
knowledge.editKnowledge
knowledge.editRelation
knowledge.disconnect
knowledge.deleteKnowledge
knowledge.confirmDelete
knowledge.confirmDeleteWithConnections
knowledge.emptyState
knowledge.subtype.observation
knowledge.subtype.concept
knowledge.subtype.reason
knowledge.subtype.fact
knowledge.subtype.insight
knowledge.subtype.pattern
knowledge.relationType
knowledge.relationLabel
knowledge.otherConnections
knowledge.certainty
knowledge.tags
knowledge.content
knowledge.source.manual
knowledge.source.ai
knowledge.source.email
knowledge.source.note
knowledge.loadError
knowledge.saveError
knowledge.deleteError
```

---

## Data flow summary

```
Quick-add (+) → KnowledgeNodeForm
                  → knowledge.create()     → knowledgeNodes (Firestore)
                  → knowledge.connect()    → knowledgeEdges (Firestore)

Detail page tab → KnowledgeConnections
                  → useKnowledgeConnections(nodeType, entityId)
                    → knowledge.connectionsForEntity()
                    → renders rows with edit/disconnect/delete actions

Network view → openAddKnowledge(node)
               → KnowledgeNodeForm (lockedEntity = node)
               → same create/connect flow
```

---

## Future work

Once this phase is stable, the next architectural step is to eliminate `graphEdges` and `syncFromStores()` by computing entity-to-entity edges reactively from domain store data (which already holds the relationship arrays). This would make the network store a pure read-only aggregation layer with nothing owned in Firestore.
