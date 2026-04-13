# Project Roadmap Module — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Overview

Each project gets a Roadmap tab: an interactive Gantt-style chart showing phases, activity bars, and milestones on a zoomable timeline. Users can create and edit roadmap items via forms, and drag bars to move or resize them. Roadmap activities are standalone planning items (separate from tasks/meetings) but can link to records in other modules.

---

## Data Model

New file: `organizer-app/types/models/roadmap.ts`

```typescript
export interface RoadmapPhase {
  id: string
  title: string
  color: string       // Vuetify color name, e.g. 'amber'
  startDate: Date
  endDate: Date
  order: number
}

export interface RoadmapActivityLink {
  module: 'tasks' | 'meetings' | 'notes'
  id: string
  title: string
}

export interface RoadmapActivity {
  id: string
  title: string
  color: string
  startDate: Date
  endDate: Date
  order: number           // row position (0-based)
  phaseId?: string        // optional membership in a phase
  links: RoadmapActivityLink[]
}

export interface RoadmapMilestone {
  id: string
  title: string
  description?: string    // shown in v-tooltip
  date: Date
  color: string
  activityId?: string     // which activity row it sits on; omitted = rendered in a dedicated "Milestones" row below all activity rows
}

export interface Roadmap {
  id: string
  projectId: string
  granularity: 'day' | 'week' | 'month' | 'quarter'
  phases: RoadmapPhase[]
  activities: RoadmapActivity[]
  milestones: RoadmapMilestone[]
  updatedAt: Date
}
```

The `Project` type in `types/models/index.ts` gains one optional field:

```typescript
roadmapId?: string   // set when a roadmap doc is first created for this project
```

**Persistence:** One Firestore document per project at `projects/{projectId}/roadmap/default`. This is a full-document replace on save, debounced 1 second after any local change.

---

## Component Architecture

### New files

```
organizer-app/components/projects/roadmap/
  ProjectRoadmap.vue          # Root: loads data, owns drag/edit state, toolbar
  RoadmapPhaseHeader.vue      # Sticky colored phase bands spanning the top
  RoadmapTimeAxis.vue         # Month/week/day column header row
  RoadmapActivityRow.vue      # One row: label cell + bar/milestone layer
  RoadmapBar.vue              # Draggable/resizable activity bar
  RoadmapMilestone.vue        # Diamond icon with v-tooltip
  RoadmapPhaseDialog.vue      # Form dialog: create/edit a phase
  RoadmapActivityDialog.vue   # Form dialog: create/edit activity + link picker
  RoadmapMilestoneDialog.vue  # Form dialog: create/edit a milestone

organizer-app/stores/roadmap.ts
organizer-app/types/models/roadmap.ts
```

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar: zoom [day|week|month|quarter] │ Shift all │ + Add  │
├──────────┬──────────────────────────────────────────────────┤
│          │ [Phase: Starten ████] [Phase: Ideeën ████████]   │ ← sticky
│          ├──────────────────────────────────────────────────┤
│          │ Jan     │ Feb     │ Mar     │ Apr     │ May  ... │ ← sticky
├──────────┼──────────────────────────────────────────────────┤
│ Roadshow │  ████████                              ◆         │
│ Brainstorm│      ██████████████                             │
│ Initiatieven│           ████████████████████               │
└──────────┴──────────────────────────────────────────────────┘
```

- **Left column** — fixed width, activity name labels; rows can be reordered by drag handle
- **Right panel** — horizontally scrollable; phase header and time axis are CSS `position: sticky top`
- **Column width** — computed from granularity setting; changing zoom updates all column widths reactively
- **Bars** — `position: absolute` within the row's timeline layer; left/width computed from date math

---

## Interactions

### View
- Milestone diamond (`◆`) shows `v-tooltip` with title + description on hover
- Activity bar with links shows a `mdi-link-variant` badge + count; clicking opens a popover listing linked records (module icon + title, each navigable)
- Right-click on a bar opens an in-app context menu: Edit / Delete / Add linked item — consistent with app-wide context menu pattern

### Edit
| Action | Trigger |
|--------|---------|
| Create activity | `+` button in toolbar → `RoadmapActivityDialog` |
| Edit activity | Click bar body (not edge) → `RoadmapActivityDialog` |
| Move activity | Drag bar body → shifts `startDate` + `endDate` together |
| Resize activity | Drag left edge → adjusts `startDate`; drag right edge → adjusts `endDate` |
| Create milestone | `+` button dropdown → `RoadmapMilestoneDialog` |
| Edit milestone | Double-click diamond → `RoadmapMilestoneDialog` |
| Create phase | `+` button dropdown → `RoadmapPhaseDialog` |
| Shift entire roadmap | "Shift all" button → dialog with +/− days input; shifts all dates |
| Delete any item | Context menu → confirmation dialog |

Drag snaps to the current granularity unit (e.g. snaps to week boundaries when granularity is `week`).

---

## Store (`stores/roadmap.ts`)

Follows existing Pinia pattern from `stores/projects.ts`:

```typescript
export const useRoadmapStore = defineStore('roadmap', {
  state: () => ({
    roadmap: null as Roadmap | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchRoadmap(projectId: string): Promise<void>
    async createRoadmap(projectId: string): Promise<void>   // first-time init
    async saveRoadmap(projectId: string): Promise<void>     // debounced 1s
    shiftAll(days: number): void                            // local + triggers save
    // Mutation helpers (update local state + trigger debounced save):
    upsertActivity(activity: RoadmapActivity): void
    deleteActivity(id: string): void
    upsertPhase(phase: RoadmapPhase): void
    deletePhase(id: string): void
    upsertMilestone(milestone: RoadmapMilestone): void
    deleteMilestone(id: string): void
  }
})
```

All mutations update local state immediately (optimistic) and schedule a debounced Firestore write.

---

## Integration into Project Detail Page

**File:** `organizer-app/pages/projects/[id].vue`

- Add `v-tab(value="roadmap")` with icon `mdi-chart-gantt` between existing tabs
- Add corresponding `v-window-item(value="roadmap")` that lazily mounts `<ProjectRoadmap :project-id="project.id" />`
- Roadmap store loads only when tab is first activated (no eager fetch)

---

## i18n Keys (new, in `en.ts` + `nl.ts`)

```
roadmap.title
roadmap.addActivity
roadmap.addPhase
roadmap.addMilestone
roadmap.shiftAll
roadmap.shiftAllDialog
roadmap.noRoadmap
roadmap.granularity.day / week / month / quarter
roadmap.linkedItems
roadmap.activity.edit / delete
roadmap.phase.edit / delete
roadmap.milestone.edit / delete
```

---

## Out of Scope

- Export to image/PDF (can be added later)
- Critical path highlighting
- Resource/capacity view
- Sharing roadmap publicly
