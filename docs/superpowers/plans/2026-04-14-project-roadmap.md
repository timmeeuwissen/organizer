# Project Roadmap Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive Gantt-style Roadmap tab to each project, with phases, activity bars, milestones, zoom levels, drag-to-move/resize, and Firestore persistence.

**Architecture:** CSS Grid + absolutely-positioned divs inside a scrollable timeline container. Drag state is owned by the root `ProjectRoadmap.vue` and communicated to child bars via Vue `provide/inject`. The full roadmap is stored as one Firestore document per project at `projects/{projectId}/roadmap/default`, saved with a 1-second debounce after any mutation.

**Tech Stack:** Nuxt 4, Vue 3, Vuetify 3, Pinia, Firestore, TypeScript, Pug templates, SASS (indented), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `organizer-app/types/models/roadmap.ts` | Create | Roadmap, RoadmapPhase, RoadmapActivity, RoadmapMilestone, RoadmapActivityLink types |
| `organizer-app/types/models/index.ts` | Modify | Add `roadmapId?: string` to `Project` interface |
| `organizer-app/firestore.rules` | Modify | Add subcollection rule for `projects/{id}/roadmap/{roadmapId}` |
| `organizer-app/locales/en.ts` | Modify | Add `roadmap:` key block |
| `organizer-app/locales/nl.ts` | Modify | Add `roadmap:` key block (Dutch) |
| `organizer-app/stores/roadmap.ts` | Create | Pinia store: fetch, create, save (debounced), shiftAll, upsert/delete helpers |
| `organizer-app/tests/unit/stores/roadmap.test.ts` | Create | Store unit tests |
| `organizer-app/composables/useRoadmapLayout.ts` | Create | Date↔column math, snap, time unit generation |
| `organizer-app/tests/unit/composables/useRoadmapLayout.test.ts` | Create | Layout math unit tests |
| `organizer-app/components/projects/roadmap/RoadmapMilestone.vue` | Create | Diamond icon with v-tooltip |
| `organizer-app/components/projects/roadmap/RoadmapBar.vue` | Create | Draggable/resizable bar with link badge and context menu |
| `organizer-app/components/projects/roadmap/RoadmapTimeAxis.vue` | Create | Sticky time column header row |
| `organizer-app/components/projects/roadmap/RoadmapPhaseHeader.vue` | Create | Sticky colored phase bands |
| `organizer-app/components/projects/roadmap/RoadmapActivityRow.vue` | Create | One row: label cell + timeline layer with bars/milestones |
| `organizer-app/components/projects/roadmap/RoadmapActivityDialog.vue` | Create | Form dialog: create/edit activity + link picker |
| `organizer-app/components/projects/roadmap/RoadmapPhaseDialog.vue` | Create | Form dialog: create/edit phase |
| `organizer-app/components/projects/roadmap/RoadmapMilestoneDialog.vue` | Create | Form dialog: create/edit milestone |
| `organizer-app/components/projects/roadmap/ProjectRoadmap.vue` | Create | Root: toolbar, drag state owner, layout, provide/inject |
| `organizer-app/pages/projects/[id].vue` | Modify | Add Roadmap tab + window item |

---

## Task 1: Type Definitions

**Files:**
- Create: `organizer-app/types/models/roadmap.ts`
- Modify: `organizer-app/types/models/index.ts`

- [ ] **Step 1: Create `organizer-app/types/models/roadmap.ts`**

```typescript
export interface RoadmapPhase {
  id: string
  title: string
  color: string       // Vuetify color name e.g. 'amber', 'blue-lighten-2'
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
  order: number           // row position, 0-based
  phaseId?: string
  links: RoadmapActivityLink[]
}

export interface RoadmapMilestone {
  id: string
  title: string
  description?: string    // shown in v-tooltip
  date: Date
  color: string
  activityId?: string     // omitted → rendered in dedicated "Milestones" row below activity rows
}

export type RoadmapGranularity = 'day' | 'week' | 'month' | 'quarter'

export interface Roadmap {
  id: string
  projectId: string
  userId: string
  granularity: RoadmapGranularity
  phases: RoadmapPhase[]
  activities: RoadmapActivity[]
  milestones: RoadmapMilestone[]
  updatedAt: Date
}
```

- [ ] **Step 2: Add `roadmapId` to `Project` in `organizer-app/types/models/index.ts`**

Find the `Project` interface (line ~119) and add after `lastActivity?: Date`:

```typescript
  roadmapId?: string      // set when roadmap doc is first created for this project
```

- [ ] **Step 3: Commit**

```bash
git add organizer-app/types/models/roadmap.ts organizer-app/types/models/index.ts
git commit -m "feat(roadmap): add Roadmap type definitions and Project.roadmapId"
```

---

## Task 2: Firestore Security Rule

**Files:**
- Modify: `organizer-app/firestore.rules`

- [ ] **Step 1: Add subcollection rule**

Inside the `match /databases/{database}/documents {` block, after the `match /projects/{projectId} {` block (around line 37), add:

```
    // Project Roadmap subcollection
    match /projects/{projectId}/roadmap/{roadmapId} {
      allow get, list: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/firestore.rules
git commit -m "feat(roadmap): add Firestore security rule for roadmap subcollection"
```

---

## Task 3: i18n Strings

**Files:**
- Modify: `organizer-app/locales/en.ts`
- Modify: `organizer-app/locales/nl.ts`

- [ ] **Step 1: Add roadmap block to `en.ts`**

After the `projects: { ... }` block, insert:

```typescript
  roadmap: {
    title: 'Roadmap',
    addActivity: 'Add activity',
    addPhase: 'Add phase',
    addMilestone: 'Add milestone',
    shiftAll: 'Shift all',
    shiftAllDialog: 'Shift entire roadmap',
    shiftDays: 'Days to shift (negative = earlier)',
    noRoadmap: 'No roadmap yet. Add an activity to get started.',
    linkedItems: 'Linked items',
    linkItem: 'Link item',
    noLinkedItems: 'No linked items',
    granularity: {
      day: 'Day',
      week: 'Week',
      month: 'Month',
      quarter: 'Quarter'
    },
    activity: {
      title: 'Activity',
      edit: 'Edit activity',
      delete: 'Delete activity',
      confirmDelete: 'Delete this activity? Linked items will not be deleted.',
      name: 'Activity name',
      startDate: 'Start date',
      endDate: 'End date',
      phase: 'Phase (optional)',
      color: 'Color'
    },
    phase: {
      title: 'Phase',
      edit: 'Edit phase',
      delete: 'Delete phase',
      confirmDelete: 'Delete this phase?',
      name: 'Phase name',
      startDate: 'Start date',
      endDate: 'End date',
      color: 'Color'
    },
    milestone: {
      title: 'Milestone',
      edit: 'Edit milestone',
      delete: 'Delete milestone',
      confirmDelete: 'Delete this milestone?',
      name: 'Milestone name',
      description: 'Description (shown in tooltip)',
      date: 'Date',
      activity: 'Activity row (optional)',
      color: 'Color'
    }
  },
```

- [ ] **Step 2: Add roadmap block to `nl.ts`**

After the `projects: { ... }` block, insert:

```typescript
  roadmap: {
    title: 'Roadmap',
    addActivity: 'Activiteit toevoegen',
    addPhase: 'Fase toevoegen',
    addMilestone: 'Mijlpaal toevoegen',
    shiftAll: 'Alles verschuiven',
    shiftAllDialog: 'Gehele roadmap verschuiven',
    shiftDays: 'Dagen te verschuiven (negatief = eerder)',
    noRoadmap: 'Nog geen roadmap. Voeg een activiteit toe om te beginnen.',
    linkedItems: 'Gekoppelde items',
    linkItem: 'Item koppelen',
    noLinkedItems: 'Geen gekoppelde items',
    granularity: {
      day: 'Dag',
      week: 'Week',
      month: 'Maand',
      quarter: 'Kwartaal'
    },
    activity: {
      title: 'Activiteit',
      edit: 'Activiteit bewerken',
      delete: 'Activiteit verwijderen',
      confirmDelete: 'Deze activiteit verwijderen? Gekoppelde items worden niet verwijderd.',
      name: 'Naam activiteit',
      startDate: 'Startdatum',
      endDate: 'Einddatum',
      phase: 'Fase (optioneel)',
      color: 'Kleur'
    },
    phase: {
      title: 'Fase',
      edit: 'Fase bewerken',
      delete: 'Fase verwijderen',
      confirmDelete: 'Deze fase verwijderen?',
      name: 'Naam fase',
      startDate: 'Startdatum',
      endDate: 'Einddatum',
      color: 'Kleur'
    },
    milestone: {
      title: 'Mijlpaal',
      edit: 'Mijlpaal bewerken',
      delete: 'Mijlpaal verwijderen',
      confirmDelete: 'Deze mijlpaal verwijderen?',
      name: 'Naam mijlpaal',
      description: 'Omschrijving (getoond in tooltip)',
      date: 'Datum',
      activity: 'Activiteitrij (optioneel)',
      color: 'Kleur'
    }
  },
```

- [ ] **Step 3: Commit**

```bash
git add organizer-app/locales/en.ts organizer-app/locales/nl.ts
git commit -m "feat(roadmap): add i18n strings for roadmap module (en + nl)"
```

---

## Task 4: Roadmap Store

**Files:**
- Create: `organizer-app/stores/roadmap.ts`

- [ ] **Step 1: Create `organizer-app/stores/roadmap.ts`**

```typescript
import { defineStore } from 'pinia'
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  getFirestore
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useNotificationStore } from '~/stores/notification'
import type { Roadmap, RoadmapActivity, RoadmapPhase, RoadmapMilestone, RoadmapGranularity } from '~/types/models/roadmap'

let _saveTimer: ReturnType<typeof setTimeout> | null = null

export const useRoadmapStore = defineStore('roadmap', {
  state: () => ({
    roadmap: null as Roadmap | null,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchRoadmap (projectId: string): Promise<void> {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      this.loading = true
      this.error = null

      try {
        const db = getFirestore()
        const ref = doc(db, 'projects', projectId, 'roadmap', 'default')
        const snap = await getDoc(ref)

        if (snap.exists()) {
          const data = snap.data()

          if (data.userId !== authStore.user.id) {
            throw new Error('Unauthorized access to roadmap')
          }

          this.roadmap = {
            ...data,
            id: snap.id,
            phases: (data.phases || []).map((p: any) => ({
              ...p,
              startDate: p.startDate?.toDate() || new Date(),
              endDate: p.endDate?.toDate() || new Date()
            })),
            activities: (data.activities || []).map((a: any) => ({
              ...a,
              startDate: a.startDate?.toDate() || new Date(),
              endDate: a.endDate?.toDate() || new Date(),
              links: a.links || []
            })),
            milestones: (data.milestones || []).map((m: any) => ({
              ...m,
              date: m.date?.toDate() || new Date()
            })),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Roadmap
        } else {
          this.roadmap = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch roadmap'
        useNotificationStore().error('Failed to load roadmap')
        console.error('[roadmap] fetchRoadmap error:', error)
      } finally {
        this.loading = false
      }
    },

    async createRoadmap (projectId: string): Promise<void> {
      const authStore = useAuthStore()
      if (!authStore.user) { return }

      const now = new Date()
      const newRoadmap: Roadmap = {
        id: 'default',
        projectId,
        userId: authStore.user.id,
        granularity: 'month',
        phases: [],
        activities: [],
        milestones: [],
        updatedAt: now
      }

      this.roadmap = newRoadmap
      await this._persistRoadmap(projectId)
    },

    scheduleSave (projectId: string): void {
      if (_saveTimer) { clearTimeout(_saveTimer) }
      _saveTimer = setTimeout(() => { void this._persistRoadmap(projectId) }, 1000)
    },

    async _persistRoadmap (projectId: string): Promise<void> {
      const authStore = useAuthStore()
      if (!authStore.user || !this.roadmap) { return }

      try {
        const db = getFirestore()
        const ref = doc(db, 'projects', projectId, 'roadmap', 'default')
        await setDoc(ref, {
          ...this.roadmap,
          updatedAt: serverTimestamp()
        })
      } catch (error: any) {
        useNotificationStore().error('Failed to save roadmap')
        console.error('[roadmap] save error:', error)
      }
    },

    setGranularity (projectId: string, granularity: RoadmapGranularity): void {
      if (!this.roadmap) { return }
      this.roadmap.granularity = granularity
      this.scheduleSave(projectId)
    },

    shiftAll (projectId: string, days: number): void {
      if (!this.roadmap) { return }
      const ms = days * 86400000

      this.roadmap.phases = this.roadmap.phases.map(p => ({
        ...p,
        startDate: new Date(p.startDate.getTime() + ms),
        endDate: new Date(p.endDate.getTime() + ms)
      }))
      this.roadmap.activities = this.roadmap.activities.map(a => ({
        ...a,
        startDate: new Date(a.startDate.getTime() + ms),
        endDate: new Date(a.endDate.getTime() + ms)
      }))
      this.roadmap.milestones = this.roadmap.milestones.map(m => ({
        ...m,
        date: new Date(m.date.getTime() + ms)
      }))
      this.scheduleSave(projectId)
    },

    upsertActivity (projectId: string, activity: RoadmapActivity): void {
      if (!this.roadmap) { return }
      const idx = this.roadmap.activities.findIndex(a => a.id === activity.id)
      if (idx === -1) {
        this.roadmap.activities.push(activity)
      } else {
        this.roadmap.activities[idx] = activity
      }
      this.scheduleSave(projectId)
    },

    deleteActivity (projectId: string, id: string): void {
      if (!this.roadmap) { return }
      this.roadmap.activities = this.roadmap.activities.filter(a => a.id !== id)
      this.roadmap.milestones = this.roadmap.milestones.map(m =>
        m.activityId === id ? { ...m, activityId: undefined } : m
      )
      this.scheduleSave(projectId)
    },

    upsertPhase (projectId: string, phase: RoadmapPhase): void {
      if (!this.roadmap) { return }
      const idx = this.roadmap.phases.findIndex(p => p.id === phase.id)
      if (idx === -1) {
        this.roadmap.phases.push(phase)
      } else {
        this.roadmap.phases[idx] = phase
      }
      this.scheduleSave(projectId)
    },

    deletePhase (projectId: string, id: string): void {
      if (!this.roadmap) { return }
      this.roadmap.phases = this.roadmap.phases.filter(p => p.id !== id)
      this.roadmap.activities = this.roadmap.activities.map(a =>
        a.phaseId === id ? { ...a, phaseId: undefined } : a
      )
      this.scheduleSave(projectId)
    },

    upsertMilestone (projectId: string, milestone: RoadmapMilestone): void {
      if (!this.roadmap) { return }
      const idx = this.roadmap.milestones.findIndex(m => m.id === milestone.id)
      if (idx === -1) {
        this.roadmap.milestones.push(milestone)
      } else {
        this.roadmap.milestones[idx] = milestone
      }
      this.scheduleSave(projectId)
    },

    deleteMilestone (projectId: string, id: string): void {
      if (!this.roadmap) { return }
      this.roadmap.milestones = this.roadmap.milestones.filter(m => m.id !== id)
      this.scheduleSave(projectId)
    }
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/stores/roadmap.ts
git commit -m "feat(roadmap): add roadmap Pinia store"
```

---

## Task 5: Roadmap Store Tests

**Files:**
- Create: `organizer-app/tests/unit/stores/roadmap.test.ts`

- [ ] **Step 1: Create `organizer-app/tests/unit/stores/roadmap.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoadmapStore } from '../../../stores/roadmap'
import type { Roadmap, RoadmapActivity, RoadmapPhase, RoadmapMilestone } from '../../../types/models/roadmap'

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'user-1' } }))
}))
vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({ error: vi.fn() }))
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(() => ({}))
}))

const now = new Date('2026-01-01')

function makeRoadmap (overrides: Partial<Roadmap> = {}): Roadmap {
  return {
    id: 'default',
    projectId: 'proj-1',
    userId: 'user-1',
    granularity: 'month',
    phases: [],
    activities: [],
    milestones: [],
    updatedAt: now,
    ...overrides
  }
}

function makeActivity (overrides: Partial<RoadmapActivity> = {}): RoadmapActivity {
  return {
    id: 'act-1',
    title: 'Test Activity',
    color: 'primary',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-03-01'),
    order: 0,
    links: [],
    ...overrides
  }
}

function makeMilestone (overrides: Partial<RoadmapMilestone> = {}): RoadmapMilestone {
  return {
    id: 'ms-1',
    title: 'Launch',
    date: new Date('2026-03-15'),
    color: 'amber',
    ...overrides
  }
}

describe('Roadmap Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with null roadmap', () => {
    expect(useRoadmapStore().roadmap).toBeNull()
  })

  it('upsertActivity adds a new activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap()
    const act = makeActivity()
    store.upsertActivity('proj-1', act)
    expect(store.roadmap!.activities).toHaveLength(1)
    expect(store.roadmap!.activities[0].id).toBe('act-1')
  })

  it('upsertActivity updates an existing activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({ activities: [makeActivity()] })
    store.upsertActivity('proj-1', makeActivity({ title: 'Updated' }))
    expect(store.roadmap!.activities).toHaveLength(1)
    expect(store.roadmap!.activities[0].title).toBe('Updated')
  })

  it('deleteActivity removes the activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({ activities: [makeActivity()] })
    store.deleteActivity('proj-1', 'act-1')
    expect(store.roadmap!.activities).toHaveLength(0)
  })

  it('deleteActivity clears activityId from milestones on that activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({
      activities: [makeActivity()],
      milestones: [makeMilestone({ activityId: 'act-1' })]
    })
    store.deleteActivity('proj-1', 'act-1')
    expect(store.roadmap!.milestones[0].activityId).toBeUndefined()
  })

  it('deletePhase clears phaseId from activities on that phase', () => {
    const store = useRoadmapStore()
    const phase: RoadmapPhase = { id: 'ph-1', title: 'Phase 1', color: 'blue', startDate: now, endDate: now, order: 0 }
    store.roadmap = makeRoadmap({
      phases: [phase],
      activities: [makeActivity({ phaseId: 'ph-1' })]
    })
    store.deletePhase('proj-1', 'ph-1')
    expect(store.roadmap!.phases).toHaveLength(0)
    expect(store.roadmap!.activities[0].phaseId).toBeUndefined()
  })

  it('shiftAll moves all dates by the given days', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({
      activities: [makeActivity({
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-03-01')
      })],
      milestones: [makeMilestone({ date: new Date('2026-03-15') })]
    })
    store.shiftAll('proj-1', 7)
    expect(store.roadmap!.activities[0].startDate.toISOString().slice(0, 10)).toBe('2026-02-08')
    expect(store.roadmap!.activities[0].endDate.toISOString().slice(0, 10)).toBe('2026-03-08')
    expect(store.roadmap!.milestones[0].date.toISOString().slice(0, 10)).toBe('2026-03-22')
  })

  it('shiftAll with negative days shifts earlier', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({
      activities: [makeActivity({ startDate: new Date('2026-02-08'), endDate: new Date('2026-03-08') })]
    })
    store.shiftAll('proj-1', -7)
    expect(store.roadmap!.activities[0].startDate.toISOString().slice(0, 10)).toBe('2026-02-01')
  })

  it('setGranularity updates granularity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap()
    store.setGranularity('proj-1', 'week')
    expect(store.roadmap!.granularity).toBe('week')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd organizer-app && npm run test -- tests/unit/stores/roadmap.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add organizer-app/tests/unit/stores/roadmap.test.ts
git commit -m "test(roadmap): add roadmap store unit tests"
```

---

## Task 6: Layout Composable

**Files:**
- Create: `organizer-app/composables/useRoadmapLayout.ts`
- Create: `organizer-app/tests/unit/composables/useRoadmapLayout.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `organizer-app/tests/unit/composables/useRoadmapLayout.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  COLUMN_WIDTH,
  dateToColumn,
  columnToDate,
  durationInColumns,
  snapToGranularity,
  generateTimeUnits
} from '../../../composables/useRoadmapLayout'

const base = new Date('2026-01-01') // Thursday

describe('COLUMN_WIDTH', () => {
  it('returns pixel widths for each granularity', () => {
    expect(COLUMN_WIDTH.day).toBe(24)
    expect(COLUMN_WIDTH.week).toBe(80)
    expect(COLUMN_WIDTH.month).toBe(160)
    expect(COLUMN_WIDTH.quarter).toBe(200)
  })
})

describe('dateToColumn', () => {
  it('returns 0 for the base date with day granularity', () => {
    expect(dateToColumn(base, base, 'day')).toBe(0)
  })

  it('returns 7 for 7 days later with day granularity', () => {
    const d = new Date('2026-01-08')
    expect(dateToColumn(d, base, 'day')).toBe(7)
  })

  it('returns 1 for 7 days later with week granularity', () => {
    const d = new Date('2026-01-08')
    expect(dateToColumn(d, base, 'week')).toBe(1)
  })

  it('returns 1 for Feb 1 with month granularity starting Jan 1', () => {
    const d = new Date('2026-02-01')
    expect(dateToColumn(d, base, 'month')).toBe(1)
  })

  it('returns 1 for Apr 1 with quarter granularity starting Jan 1', () => {
    const d = new Date('2026-04-01')
    expect(dateToColumn(d, base, 'quarter')).toBe(1)
  })
})

describe('columnToDate', () => {
  it('round-trips with dateToColumn for day', () => {
    const d = new Date('2026-03-15')
    const col = dateToColumn(d, base, 'day')
    const result = columnToDate(col, base, 'day')
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-15')
  })

  it('round-trips with dateToColumn for month', () => {
    const d = new Date('2026-04-01')
    const col = dateToColumn(d, base, 'month')
    const result = columnToDate(col, base, 'month')
    expect(result.toISOString().slice(0, 10)).toBe('2026-04-01')
  })
})

describe('durationInColumns', () => {
  it('returns 0 for same start and end with day granularity', () => {
    expect(durationInColumns(base, base, 'day')).toBe(0)
  })

  it('returns 31 for Jan 1 to Feb 1 with day granularity', () => {
    expect(durationInColumns(base, new Date('2026-02-01'), 'day')).toBe(31)
  })

  it('returns 1 for Jan 1 to Feb 1 with month granularity', () => {
    expect(durationInColumns(base, new Date('2026-02-01'), 'month')).toBe(1)
  })
})

describe('snapToGranularity', () => {
  it('snaps to start of day', () => {
    const d = new Date('2026-03-15T14:35:00Z')
    expect(snapToGranularity(d, 'day').toISOString()).toContain('T00:00:00')
  })

  it('snaps to start of the week (Monday)', () => {
    const d = new Date('2026-01-07') // Wednesday
    const snapped = snapToGranularity(d, 'week')
    expect(snapped.getDay()).toBe(1) // Monday
  })

  it('snaps to start of month', () => {
    const d = new Date('2026-03-17')
    expect(snapToGranularity(d, 'month').getDate()).toBe(1)
  })

  it('snaps to start of quarter', () => {
    const d = new Date('2026-05-10') // May → Q2 starts Apr 1
    const snapped = snapToGranularity(d, 'quarter')
    expect(snapped.toISOString().slice(0, 10)).toBe('2026-04-01')
  })
})

describe('generateTimeUnits', () => {
  it('generates correct number of months between Jan and Mar', () => {
    const units = generateTimeUnits(new Date('2026-01-01'), new Date('2026-03-31'), 'month')
    expect(units).toHaveLength(3)
    expect(units[0].label).toBe('Jan 2026')
    expect(units[2].label).toBe('Mar 2026')
  })

  it('generates week units with ISO week labels', () => {
    const units = generateTimeUnits(new Date('2026-01-05'), new Date('2026-01-18'), 'week')
    expect(units.length).toBeGreaterThanOrEqual(2)
    expect(units[0].label).toMatch(/W\d+/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd organizer-app && npm run test -- tests/unit/composables/useRoadmapLayout.test.ts
```

Expected: FAIL — `useRoadmapLayout` module not found.

- [ ] **Step 3: Create `organizer-app/composables/useRoadmapLayout.ts`**

```typescript
import type { RoadmapGranularity } from '~/types/models/roadmap'

export const COLUMN_WIDTH: Record<RoadmapGranularity, number> = {
  day: 24,
  week: 80,
  month: 160,
  quarter: 200
}

/** How many granularity-units from baseDate to targetDate (fractional, truncated). */
export function dateToColumn (date: Date, baseDate: Date, granularity: RoadmapGranularity): number {
  const msPerDay = 86400000
  const diffDays = (date.getTime() - baseDate.getTime()) / msPerDay

  switch (granularity) {
    case 'day': return Math.floor(diffDays)
    case 'week': return Math.floor(diffDays / 7)
    case 'month': {
      const months = (date.getFullYear() - baseDate.getFullYear()) * 12
        + date.getMonth() - baseDate.getMonth()
      return months
    }
    case 'quarter': {
      const months = (date.getFullYear() - baseDate.getFullYear()) * 12
        + date.getMonth() - baseDate.getMonth()
      return Math.floor(months / 3)
    }
  }
}

/** Convert a column index back to a Date. */
export function columnToDate (col: number, baseDate: Date, granularity: RoadmapGranularity): Date {
  const d = new Date(baseDate)
  switch (granularity) {
    case 'day': d.setDate(d.getDate() + col); break
    case 'week': d.setDate(d.getDate() + col * 7); break
    case 'month': d.setMonth(d.getMonth() + col); break
    case 'quarter': d.setMonth(d.getMonth() + col * 3); break
  }
  return d
}

/** Duration from startDate to endDate in column units. */
export function durationInColumns (startDate: Date, endDate: Date, granularity: RoadmapGranularity): number {
  return dateToColumn(endDate, startDate, granularity)
}

/** Snap a date to the start of the current granularity unit. */
export function snapToGranularity (date: Date, granularity: RoadmapGranularity): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  switch (granularity) {
    case 'day': break
    case 'week': {
      // Snap to Monday (ISO week start)
      const day = d.getDay() // 0=Sun, 1=Mon … 6=Sat
      const diffToMon = (day === 0 ? -6 : 1 - day)
      d.setDate(d.getDate() + diffToMon)
      break
    }
    case 'month': d.setDate(1); break
    case 'quarter': {
      const q = Math.floor(d.getMonth() / 3)
      d.setMonth(q * 3, 1)
      break
    }
  }
  return d
}

export interface TimeUnit {
  label: string
  date: Date    // start of this unit
}

/** Generate an array of time unit headers spanning [startDate, endDate]. */
export function generateTimeUnits (startDate: Date, endDate: Date, granularity: RoadmapGranularity): TimeUnit[] {
  const units: TimeUnit[] = []
  let cur = snapToGranularity(new Date(startDate), granularity)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4']

  while (cur <= endDate) {
    let label = ''
    switch (granularity) {
      case 'day':
        label = `${cur.getDate()} ${monthNames[cur.getMonth()]}`
        break
      case 'week': {
        // ISO week number
        const tmp = new Date(cur)
        tmp.setHours(0, 0, 0, 0)
        tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
        const yearStart = new Date(tmp.getFullYear(), 0, 4)
        const weekNum = 1 + Math.round((tmp.getTime() - yearStart.getTime()) / 604800000)
        label = `W${weekNum}`
        break
      }
      case 'month':
        label = `${monthNames[cur.getMonth()]} ${cur.getFullYear()}`
        break
      case 'quarter':
        label = `${quarterNames[Math.floor(cur.getMonth() / 3)]} ${cur.getFullYear()}`
        break
    }
    units.push({ label, date: new Date(cur) })

    // Advance by one unit
    switch (granularity) {
      case 'day': cur.setDate(cur.getDate() + 1); break
      case 'week': cur.setDate(cur.getDate() + 7); break
      case 'month': cur.setMonth(cur.getMonth() + 1); break
      case 'quarter': cur.setMonth(cur.getMonth() + 3); break
    }
  }

  return units
}

/**
 * Convert a pixel offset within the timeline container to a Date,
 * snapped to the current granularity.
 */
export function pixelToDate (
  px: number,
  baseDate: Date,
  granularity: RoadmapGranularity
): Date {
  const col = Math.round(px / COLUMN_WIDTH[granularity])
  return snapToGranularity(columnToDate(col, baseDate, granularity), granularity)
}
```

- [ ] **Step 4: Run tests and verify all pass**

```bash
cd organizer-app && npm run test -- tests/unit/composables/useRoadmapLayout.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add organizer-app/composables/useRoadmapLayout.ts organizer-app/tests/unit/composables/useRoadmapLayout.test.ts
git commit -m "feat(roadmap): add useRoadmapLayout composable with date math"
```

---

## Task 7: RoadmapMilestone Component

**Files:**
- Create: `organizer-app/components/projects/roadmap/RoadmapMilestone.vue`

- [ ] **Step 1: Create `organizer-app/components/projects/roadmap/RoadmapMilestone.vue`**

```pug
//- template lang="pug"
template(lang="pug")
  v-tooltip(:text="tooltipText" location="top")
    template(v-slot:activator="{ props }")
      span.roadmap-milestone(
        v-bind="props"
        :style="{ left: `${leftPx}px`, color: `rgb(var(--v-theme-${color}))` }"
        @dblclick.stop="$emit('edit')"
      ) ◆
```

Full file content:

```vue
<template lang="pug">
v-tooltip(:text="tooltipText" location="top")
  template(v-slot:activator="{ props }")
    span.roadmap-milestone(
      v-bind="props"
      :style="{ left: `${leftPx}px`, color: `rgb(var(--v-theme-${color}))` }"
      @dblclick.stop="$emit('edit')"
    ) ◆
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  description?: string
  leftPx: number
  color: string
}>()

defineEmits<{ edit: [] }>()

const tooltipText = computed(() =>
  props.description ? `${props.title}: ${props.description}` : props.title
)
</script>

<style lang="sass">
.roadmap-milestone
  position: absolute
  top: 50%
  transform: translate(-50%, -50%)
  font-size: 18px
  cursor: pointer
  user-select: none
  z-index: 2
  &:hover
    filter: brightness(1.3)
</style>
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/components/projects/roadmap/RoadmapMilestone.vue
git commit -m "feat(roadmap): add RoadmapMilestone component"
```

---

## Task 8: RoadmapBar Component

**Files:**
- Create: `organizer-app/components/projects/roadmap/RoadmapBar.vue`

- [ ] **Step 1: Create `organizer-app/components/projects/roadmap/RoadmapBar.vue`**

```vue
<template lang="pug">
div.roadmap-bar-wrap(
  :style="wrapStyle"
  @mousedown.left.stop="onBodyMousedown"
  @contextmenu.prevent="showMenu = true"
)
  //- Left resize handle
  div.roadmap-bar__handle.roadmap-bar__handle--left(
    @mousedown.left.stop="onHandleMousedown('left', $event)"
  )
  //- Bar body
  div.roadmap-bar__body(:style="{ background: `rgb(var(--v-theme-${color}))` }")
    span.roadmap-bar__label {{ title }}
    v-btn.roadmap-bar__link-badge(
      v-if="links.length"
      icon
      size="x-small"
      variant="tonal"
      :title="$t('roadmap.linkedItems')"
      @click.stop="showLinks = true"
    )
      v-badge(:content="links.length" color="white" text-color="black")
        v-icon(size="small") mdi-link-variant
  //- Right resize handle
  div.roadmap-bar__handle.roadmap-bar__handle--right(
    @mousedown.left.stop="onHandleMousedown('right', $event)"
  )

  //- Context menu
  v-menu(v-model="showMenu" :style="{ position: 'absolute', top: 0, left: 0 }")
    v-list(density="compact")
      v-list-item(prepend-icon="mdi-pencil" :title="$t('roadmap.activity.edit')" @click="$emit('edit')")
      v-list-item(prepend-icon="mdi-link-plus" :title="$t('roadmap.linkItem')" @click="$emit('link')")
      v-list-item(prepend-icon="mdi-delete" :title="$t('roadmap.activity.delete')" @click="$emit('delete')")

  //- Links popover
  v-dialog(v-model="showLinks" max-width="360")
    v-card
      v-card-title {{ $t('roadmap.linkedItems') }}
      v-list(density="compact")
        v-list-item(
          v-for="lnk in links"
          :key="lnk.id"
          :prepend-icon="moduleIcon(lnk.module)"
          :title="lnk.title"
          :to="moduleRoute(lnk)"
        )
      v-card-actions
        v-spacer
        v-btn(@click="showLinks = false") {{ $t('common.close') }}
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RoadmapActivityLink } from '~/types/models/roadmap'

const props = defineProps<{
  title: string
  color: string
  leftPx: number
  widthPx: number
  links: RoadmapActivityLink[]
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  link: []
  dragStart: [mode: 'move' | 'resize-left' | 'resize-right', startX: number]
}>()

const showMenu = ref(false)
const showLinks = ref(false)

const wrapStyle = computed(() => ({
  left: `${props.leftPx}px`,
  width: `${props.widthPx}px`
}))

function onBodyMousedown (e: MouseEvent) {
  emit('dragStart', 'move', e.clientX)
}

function onHandleMousedown (side: 'left' | 'right', e: MouseEvent) {
  emit('dragStart', side === 'left' ? 'resize-left' : 'resize-right', e.clientX)
}

function moduleIcon (module: RoadmapActivityLink['module']): string {
  switch (module) {
    case 'tasks': return 'mdi-checkbox-marked-outline'
    case 'meetings': return 'mdi-account-group-outline'
    case 'notes': return 'mdi-note-outline'
  }
}

function moduleRoute (lnk: RoadmapActivityLink): string {
  switch (lnk.module) {
    case 'tasks': return `/tasks?id=${lnk.id}`
    case 'meetings': return `/meetings/${lnk.id}`
    case 'notes': return '#'
  }
}
</script>

<style lang="sass">
.roadmap-bar-wrap
  position: absolute
  top: 4px
  bottom: 4px
  display: flex
  align-items: stretch
  cursor: grab
  z-index: 1

  &:active
    cursor: grabbing

.roadmap-bar__handle
  width: 6px
  flex-shrink: 0
  cursor: ew-resize
  background: rgba(0,0,0,0.2)
  border-radius: 2px 0 0 2px

  &--right
    border-radius: 0 2px 2px 0

.roadmap-bar__body
  flex: 1
  border-radius: 2px
  display: flex
  align-items: center
  padding: 0 6px
  overflow: hidden
  user-select: none

.roadmap-bar__label
  font-size: 12px
  color: white
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  flex: 1

.roadmap-bar__link-badge
  flex-shrink: 0
  margin-left: 4px
</style>
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/components/projects/roadmap/RoadmapBar.vue
git commit -m "feat(roadmap): add RoadmapBar component with drag events and context menu"
```

---

## Task 9: RoadmapTimeAxis Component

**Files:**
- Create: `organizer-app/components/projects/roadmap/RoadmapTimeAxis.vue`

- [ ] **Step 1: Create `organizer-app/components/projects/roadmap/RoadmapTimeAxis.vue`**

```vue
<template lang="pug">
div.roadmap-time-axis
  div.roadmap-time-axis__cell(
    v-for="unit in units"
    :key="unit.date.toISOString()"
    :style="{ width: `${colWidth}px` }"
  ) {{ unit.label }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { generateTimeUnits, COLUMN_WIDTH } from '~/composables/useRoadmapLayout'
import type { RoadmapGranularity } from '~/types/models/roadmap'

const props = defineProps<{
  startDate: Date
  endDate: Date
  granularity: RoadmapGranularity
}>()

const units = computed(() => generateTimeUnits(props.startDate, props.endDate, props.granularity))
const colWidth = computed(() => COLUMN_WIDTH[props.granularity])
</script>

<style lang="sass">
.roadmap-time-axis
  display: flex
  height: 32px
  border-bottom: 1px solid rgba(0,0,0,0.12)
  position: sticky
  top: 40px   // sits below the phase header (which is sticky top: 0)
  background: rgb(var(--v-theme-surface))
  z-index: 3

.roadmap-time-axis__cell
  flex-shrink: 0
  border-right: 1px solid rgba(0,0,0,0.08)
  display: flex
  align-items: center
  justify-content: center
  font-size: 11px
  color: rgba(0,0,0,0.6)
  padding: 0 4px
</style>
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/components/projects/roadmap/RoadmapTimeAxis.vue
git commit -m "feat(roadmap): add RoadmapTimeAxis component"
```

---

## Task 10: RoadmapPhaseHeader Component

**Files:**
- Create: `organizer-app/components/projects/roadmap/RoadmapPhaseHeader.vue`

- [ ] **Step 1: Create `organizer-app/components/projects/roadmap/RoadmapPhaseHeader.vue`**

```vue
<template lang="pug">
div.roadmap-phase-header
  div.roadmap-phase-header__cell(
    v-for="phase in sortedPhases"
    :key="phase.id"
    :style="phaseStyle(phase)"
    @dblclick="$emit('editPhase', phase)"
  ) {{ phase.title }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { dateToColumn, COLUMN_WIDTH } from '~/composables/useRoadmapLayout'
import type { RoadmapPhase, RoadmapGranularity } from '~/types/models/roadmap'

const props = defineProps<{
  phases: RoadmapPhase[]
  startDate: Date
  granularity: RoadmapGranularity
}>()

defineEmits<{ editPhase: [phase: RoadmapPhase] }>()

const colWidth = computed(() => COLUMN_WIDTH[props.granularity])

const sortedPhases = computed(() =>
  [...props.phases].sort((a, b) => a.order - b.order)
)

function phaseStyle (phase: RoadmapPhase) {
  const startCol = dateToColumn(phase.startDate, props.startDate, props.granularity)
  const endCol = dateToColumn(phase.endDate, props.startDate, props.granularity)
  const width = Math.max(1, endCol - startCol) * colWidth.value
  const left = startCol * colWidth.value
  return {
    position: 'absolute' as const,
    left: `${left}px`,
    width: `${width}px`,
    background: `rgb(var(--v-theme-${phase.color}))`,
    opacity: 0.85
  }
}
</script>

<style lang="sass">
.roadmap-phase-header
  position: sticky
  top: 0
  height: 40px
  z-index: 4
  background: rgb(var(--v-theme-surface))
  border-bottom: 1px solid rgba(0,0,0,0.12)
  position: relative  // for absolute children

.roadmap-phase-header__cell
  position: absolute
  top: 0
  bottom: 0
  display: flex
  align-items: center
  padding: 0 8px
  font-size: 12px
  font-weight: 600
  color: white
  border-radius: 2px
  cursor: pointer
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis
</style>
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/components/projects/roadmap/RoadmapPhaseHeader.vue
git commit -m "feat(roadmap): add RoadmapPhaseHeader component"
```

---

## Task 11: RoadmapActivityRow Component

**Files:**
- Create: `organizer-app/components/projects/roadmap/RoadmapActivityRow.vue`

- [ ] **Step 1: Create `organizer-app/components/projects/roadmap/RoadmapActivityRow.vue`**

```vue
<template lang="pug">
div.roadmap-activity-row
  //- Label cell (fixed width)
  div.roadmap-activity-row__label
    span {{ label }}

  //- Timeline cell (scrolls with container)
  div.roadmap-activity-row__timeline(:style="{ width: `${timelineWidth}px` }")
    //- Activity bar (only when an activity is provided)
    RoadmapBar(
      v-if="activity"
      :title="activity.title"
      :color="activity.color"
      :left-px="barLeft"
      :width-px="barWidth"
      :links="activity.links"
      @edit="$emit('editActivity', activity)"
      @delete="$emit('deleteActivity', activity.id)"
      @link="$emit('linkActivity', activity)"
      @drag-start="(mode, startX) => $emit('dragStart', activity!.id, mode, startX)"
    )
    //- Milestones on this row
    RoadmapMilestone(
      v-for="ms in rowMilestones"
      :key="ms.id"
      :title="ms.title"
      :description="ms.description"
      :left-px="msLeft(ms)"
      :color="ms.color"
      @edit="$emit('editMilestone', ms)"
    )
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { dateToColumn, durationInColumns, COLUMN_WIDTH } from '~/composables/useRoadmapLayout'
import type { RoadmapActivity, RoadmapMilestone, RoadmapGranularity } from '~/types/models/roadmap'
import RoadmapBar from './RoadmapBar.vue'
import RoadmapMilestone from './RoadmapMilestone.vue'

const props = defineProps<{
  label: string
  activity?: RoadmapActivity    // undefined for the "Milestones" footer row
  milestones: RoadmapMilestone[]
  startDate: Date
  granularity: RoadmapGranularity
  totalColumns: number
}>()

defineEmits<{
  editActivity: [activity: RoadmapActivity]
  deleteActivity: [id: string]
  linkActivity: [activity: RoadmapActivity]
  editMilestone: [milestone: RoadmapMilestone]
  dragStart: [activityId: string, mode: 'move' | 'resize-left' | 'resize-right', startX: number]
}>()

const colWidth = computed(() => COLUMN_WIDTH[props.granularity])
const timelineWidth = computed(() => props.totalColumns * colWidth.value)

const barLeft = computed(() => {
  if (!props.activity) { return 0 }
  return dateToColumn(props.activity.startDate, props.startDate, props.granularity) * colWidth.value
})

const barWidth = computed(() => {
  if (!props.activity) { return 0 }
  return Math.max(colWidth.value, durationInColumns(props.activity.startDate, props.activity.endDate, props.granularity) * colWidth.value)
})

const rowMilestones = computed(() => props.milestones)

function msLeft (ms: RoadmapMilestone): number {
  return dateToColumn(ms.date, props.startDate, props.granularity) * colWidth.value
}
</script>

<style lang="sass">
.roadmap-activity-row
  display: flex
  height: 40px
  border-bottom: 1px solid rgba(0,0,0,0.06)

  &:hover
    background: rgba(0,0,0,0.02)

.roadmap-activity-row__label
  width: 180px
  min-width: 180px
  display: flex
  align-items: center
  padding: 0 12px
  font-size: 13px
  border-right: 1px solid rgba(0,0,0,0.12)
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis

.roadmap-activity-row__timeline
  position: relative
  flex-shrink: 0
</style>
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/components/projects/roadmap/RoadmapActivityRow.vue
git commit -m "feat(roadmap): add RoadmapActivityRow component"
```

---

## Task 12: Dialog Components

**Files:**
- Create: `organizer-app/components/projects/roadmap/RoadmapActivityDialog.vue`
- Create: `organizer-app/components/projects/roadmap/RoadmapPhaseDialog.vue`
- Create: `organizer-app/components/projects/roadmap/RoadmapMilestoneDialog.vue`

- [ ] **Step 1: Create `RoadmapActivityDialog.vue`**

```vue
<template lang="pug">
v-dialog(v-model="open" max-width="480" @keydown.esc="open = false")
  v-card
    v-card-title {{ isNew ? $t('roadmap.addActivity') : $t('roadmap.activity.edit') }}
    v-card-text
      v-text-field(
        v-model="form.title"
        :label="$t('roadmap.activity.name')"
        :rules="[v => !!v || $t('common.title') + ' required']"
        autofocus
      )
      v-row
        v-col(cols="6")
          v-text-field(
            v-model="startStr"
            type="date"
            :label="$t('roadmap.activity.startDate')"
          )
        v-col(cols="6")
          v-text-field(
            v-model="endStr"
            type="date"
            :label="$t('roadmap.activity.endDate')"
          )
      v-select(
        v-model="form.color"
        :items="colorOptions"
        :label="$t('roadmap.activity.color')"
      )
        template(v-slot:item="{ item, props: itemProps }")
          v-list-item(v-bind="itemProps")
            template(v-slot:prepend)
              v-icon(:color="item.value") mdi-square
      v-select(
        v-if="phases.length"
        v-model="form.phaseId"
        :items="phaseOptions"
        :label="$t('roadmap.activity.phase')"
        clearable
      )
      //- Links section
      v-divider.my-2
      .text-subtitle-2.mb-1 {{ $t('roadmap.linkedItems') }}
      v-chip-group
        v-chip(
          v-for="lnk in form.links"
          :key="lnk.id"
          closable
          @click:close="removeLink(lnk.id)"
        )
          v-icon(start :icon="linkIcon(lnk.module)" size="small")
          | {{ lnk.title }}
      p.text-caption.text-medium-emphasis(v-if="!form.links.length") {{ $t('roadmap.noLinkedItems') }}
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="open = false") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!form.title" @click="save") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RoadmapActivity, RoadmapPhase, RoadmapActivityLink } from '~/types/models/roadmap'

const props = defineProps<{
  modelValue: boolean
  activity?: RoadmapActivity
  phases: RoadmapPhase[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  save: [activity: Omit<RoadmapActivity, 'order'>]
}>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isNew = computed(() => !props.activity)

const colorOptions = ['primary', 'secondary', 'success', 'warning', 'error', 'info',
  'amber', 'teal', 'purple', 'indigo', 'pink', 'brown']

const phaseOptions = computed(() =>
  props.phases.map(p => ({ title: p.title, value: p.id }))
)

const form = ref(blankForm())

function blankForm () {
  return {
    title: '',
    color: 'primary',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 86400000),
    phaseId: undefined as string | undefined,
    links: [] as RoadmapActivityLink[]
  }
}

const startStr = computed({
  get: () => form.value.startDate.toISOString().slice(0, 10),
  set: v => { form.value.startDate = new Date(v) }
})

const endStr = computed({
  get: () => form.value.endDate.toISOString().slice(0, 10),
  set: v => { form.value.endDate = new Date(v) }
})

watch(() => props.modelValue, (v) => {
  if (v) {
    form.value = props.activity
      ? { ...props.activity }
      : blankForm()
  }
})

function removeLink (id: string) {
  form.value.links = form.value.links.filter(l => l.id !== id)
}

function linkIcon (module: RoadmapActivityLink['module']): string {
  switch (module) {
    case 'tasks': return 'mdi-checkbox-marked-outline'
    case 'meetings': return 'mdi-account-group-outline'
    case 'notes': return 'mdi-note-outline'
  }
}

function save () {
  emit('save', {
    id: props.activity?.id ?? crypto.randomUUID(),
    title: form.value.title,
    color: form.value.color,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    phaseId: form.value.phaseId,
    links: form.value.links
  })
  open.value = false
}
</script>
```

- [ ] **Step 2: Create `RoadmapPhaseDialog.vue`**

```vue
<template lang="pug">
v-dialog(v-model="open" max-width="400" @keydown.esc="open = false")
  v-card
    v-card-title {{ isNew ? $t('roadmap.addPhase') : $t('roadmap.phase.edit') }}
    v-card-text
      v-text-field(
        v-model="form.title"
        :label="$t('roadmap.phase.name')"
        autofocus
      )
      v-row
        v-col(cols="6")
          v-text-field(v-model="startStr" type="date" :label="$t('roadmap.phase.startDate')")
        v-col(cols="6")
          v-text-field(v-model="endStr" type="date" :label="$t('roadmap.phase.endDate')")
      v-select(
        v-model="form.color"
        :items="colorOptions"
        :label="$t('roadmap.phase.color')"
      )
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="open = false") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!form.title" @click="save") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RoadmapPhase } from '~/types/models/roadmap'

const props = defineProps<{
  modelValue: boolean
  phase?: RoadmapPhase
  nextOrder: number
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  save: [phase: RoadmapPhase]
}>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isNew = computed(() => !props.phase)
const colorOptions = ['amber', 'teal', 'blue', 'green', 'purple', 'orange', 'red', 'indigo']

const form = ref(blankForm())

function blankForm () {
  return {
    title: '',
    color: 'amber',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000)
  }
}

const startStr = computed({
  get: () => form.value.startDate.toISOString().slice(0, 10),
  set: v => { form.value.startDate = new Date(v) }
})

const endStr = computed({
  get: () => form.value.endDate.toISOString().slice(0, 10),
  set: v => { form.value.endDate = new Date(v) }
})

watch(() => props.modelValue, (v) => {
  if (v) {
    form.value = props.phase
      ? { ...props.phase }
      : blankForm()
  }
})

function save () {
  emit('save', {
    id: props.phase?.id ?? crypto.randomUUID(),
    title: form.value.title,
    color: form.value.color,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    order: props.phase?.order ?? props.nextOrder
  })
  open.value = false
}
</script>
```

- [ ] **Step 3: Create `RoadmapMilestoneDialog.vue`**

```vue
<template lang="pug">
v-dialog(v-model="open" max-width="400" @keydown.esc="open = false")
  v-card
    v-card-title {{ isNew ? $t('roadmap.addMilestone') : $t('roadmap.milestone.edit') }}
    v-card-text
      v-text-field(
        v-model="form.title"
        :label="$t('roadmap.milestone.name')"
        autofocus
      )
      v-text-field(
        v-model="form.description"
        :label="$t('roadmap.milestone.description')"
      )
      v-text-field(v-model="dateStr" type="date" :label="$t('roadmap.milestone.date')")
      v-select(
        v-model="form.color"
        :items="colorOptions"
        :label="$t('roadmap.milestone.color')"
      )
      v-select(
        v-if="activities.length"
        v-model="form.activityId"
        :items="activityOptions"
        :label="$t('roadmap.milestone.activity')"
        clearable
      )
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="open = false") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!form.title" @click="save") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RoadmapMilestone, RoadmapActivity } from '~/types/models/roadmap'

const props = defineProps<{
  modelValue: boolean
  milestone?: RoadmapMilestone
  activities: RoadmapActivity[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  save: [milestone: RoadmapMilestone]
}>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isNew = computed(() => !props.milestone)
const colorOptions = ['amber', 'orange', 'red', 'green', 'blue', 'purple']

const activityOptions = computed(() =>
  props.activities.map(a => ({ title: a.title, value: a.id }))
)

const form = ref(blankForm())

function blankForm () {
  return {
    title: '',
    description: '',
    date: new Date(),
    color: 'amber',
    activityId: undefined as string | undefined
  }
}

const dateStr = computed({
  get: () => form.value.date.toISOString().slice(0, 10),
  set: v => { form.value.date = new Date(v) }
})

watch(() => props.modelValue, (v) => {
  if (v) {
    form.value = props.milestone
      ? { ...props.milestone, description: props.milestone.description ?? '' }
      : blankForm()
  }
})

function save () {
  emit('save', {
    id: props.milestone?.id ?? crypto.randomUUID(),
    title: form.value.title,
    description: form.value.description || undefined,
    date: form.value.date,
    color: form.value.color,
    activityId: form.value.activityId
  })
  open.value = false
}
</script>
```

- [ ] **Step 4: Commit**

```bash
git add organizer-app/components/projects/roadmap/RoadmapActivityDialog.vue
git add organizer-app/components/projects/roadmap/RoadmapPhaseDialog.vue
git add organizer-app/components/projects/roadmap/RoadmapMilestoneDialog.vue
git commit -m "feat(roadmap): add roadmap dialog components (activity, phase, milestone)"
```

---

## Task 13: ProjectRoadmap Root Component

**Files:**
- Create: `organizer-app/components/projects/roadmap/ProjectRoadmap.vue`

- [ ] **Step 1: Create `organizer-app/components/projects/roadmap/ProjectRoadmap.vue`**

```vue
<template lang="pug">
div.project-roadmap

  //- Toolbar
  v-toolbar(density="compact" flat)
    v-btn-toggle(v-model="granularity" mandatory density="compact" rounded)
      v-btn(value="day" size="small") {{ $t('roadmap.granularity.day') }}
      v-btn(value="week" size="small") {{ $t('roadmap.granularity.week') }}
      v-btn(value="month" size="small") {{ $t('roadmap.granularity.month') }}
      v-btn(value="quarter" size="small") {{ $t('roadmap.granularity.quarter') }}
    v-spacer
    v-btn(prepend-icon="mdi-calendar-arrow-right" variant="tonal" size="small" @click="shiftDialog = true")
      | {{ $t('roadmap.shiftAll') }}
    v-menu
      template(v-slot:activator="{ props: menuProps }")
        v-btn(v-bind="menuProps" color="primary" prepend-icon="mdi-plus" size="small")
          | {{ $t('common.add') }}
      v-list(density="compact")
        v-list-item(prepend-icon="mdi-chart-gantt" :title="$t('roadmap.addActivity')" @click="openAddActivity")
        v-list-item(prepend-icon="mdi-flag" :title="$t('roadmap.addPhase')" @click="phaseDialog = true; editingPhase = undefined")
        v-list-item(prepend-icon="mdi-diamond-stone" :title="$t('roadmap.addMilestone')" @click="milestoneDialog = true; editingMilestone = undefined")

  //- Empty state
  v-alert(v-if="!roadmap || (!roadmap.activities.length && !roadmap.phases.length)" type="info" variant="tonal" class="ma-4")
    | {{ $t('roadmap.noRoadmap') }}

  //- Chart area
  div.project-roadmap__chart(
    v-if="roadmap"
    ref="chartEl"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  )
    //- Header: left spacer + scrollable header area
    div.project-roadmap__chart-header
      div.project-roadmap__label-spacer
      div.project-roadmap__header-scroll(ref="headerScrollEl")
        RoadmapPhaseHeader(
          :phases="roadmap.phases"
          :start-date="chartStart"
          :granularity="granularity"
          @edit-phase="p => { editingPhase = p; phaseDialog = true }"
        )
        RoadmapTimeAxis(
          :start-date="chartStart"
          :end-date="chartEnd"
          :granularity="granularity"
        )

    //- Rows
    div.project-roadmap__rows(ref="rowsEl" @scroll="syncHeaderScroll")
      RoadmapActivityRow(
        v-for="activity in sortedActivities"
        :key="activity.id"
        :label="activity.title"
        :activity="activity"
        :milestones="milestonesForActivity(activity.id)"
        :start-date="chartStart"
        :granularity="granularity"
        :total-columns="totalColumns"
        @edit-activity="a => { editingActivity = a; activityDialog = true }"
        @delete-activity="confirmDeleteActivity"
        @link-activity="a => { editingActivity = a; activityDialog = true }"
        @edit-milestone="ms => { editingMilestone = ms; milestoneDialog = true }"
        @drag-start="onDragStart"
      )
      //- Standalone milestones row
      RoadmapActivityRow(
        v-if="standaloneMilestones.length"
        label="Milestones"
        :milestones="standaloneMilestones"
        :start-date="chartStart"
        :granularity="granularity"
        :total-columns="totalColumns"
        @edit-milestone="ms => { editingMilestone = ms; milestoneDialog = true }"
      )

  //- Dialogs
  RoadmapActivityDialog(
    v-model="activityDialog"
    :activity="editingActivity"
    :phases="roadmap?.phases ?? []"
    @save="onSaveActivity"
  )

  RoadmapPhaseDialog(
    v-model="phaseDialog"
    :phase="editingPhase"
    :next-order="roadmap?.phases.length ?? 0"
    @save="onSavePhase"
  )

  RoadmapMilestoneDialog(
    v-model="milestoneDialog"
    :milestone="editingMilestone"
    :activities="roadmap?.activities ?? []"
    @save="onSaveMilestone"
  )

  //- Shift all dialog
  v-dialog(v-model="shiftDialog" max-width="320")
    v-card
      v-card-title {{ $t('roadmap.shiftAllDialog') }}
      v-card-text
        v-text-field(v-model.number="shiftDays" type="number" :label="$t('roadmap.shiftDays')" autofocus)
      v-card-actions
        v-spacer
        v-btn(variant="text" @click="shiftDialog = false") {{ $t('common.cancel') }}
        v-btn(color="primary" @click="applyShift") {{ $t('common.apply') }}

  //- Delete confirmation
  v-dialog(v-model="deleteDialog" max-width="360")
    v-card
      v-card-title {{ $t('roadmap.activity.delete') }}
      v-card-text {{ $t('roadmap.activity.confirmDelete') }}
      v-card-actions
        v-spacer
        v-btn(variant="text" @click="deleteDialog = false") {{ $t('common.cancel') }}
        v-btn(color="error" @click="doDeleteActivity") {{ $t('common.delete') }}
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoadmapStore } from '~/stores/roadmap'
import { dateToColumn, pixelToDate, COLUMN_WIDTH, generateTimeUnits } from '~/composables/useRoadmapLayout'
import type { RoadmapActivity, RoadmapPhase, RoadmapMilestone, RoadmapGranularity } from '~/types/models/roadmap'
import RoadmapPhaseHeader from './RoadmapPhaseHeader.vue'
import RoadmapTimeAxis from './RoadmapTimeAxis.vue'
import RoadmapActivityRow from './RoadmapActivityRow.vue'
import RoadmapActivityDialog from './RoadmapActivityDialog.vue'
import RoadmapPhaseDialog from './RoadmapPhaseDialog.vue'
import RoadmapMilestoneDialog from './RoadmapMilestoneDialog.vue'

const props = defineProps<{ projectId: string }>()

const roadmapStore = useRoadmapStore()
const roadmap = computed(() => roadmapStore.roadmap)

// ── Load ───────────────────────────────────────────────────────────
onMounted(async () => {
  await roadmapStore.fetchRoadmap(props.projectId)
  if (!roadmap.value) {
    await roadmapStore.createRoadmap(props.projectId)
  }
})

// ── Granularity ────────────────────────────────────────────────────
const granularity = computed<RoadmapGranularity>({
  get: () => roadmap.value?.granularity ?? 'month',
  set: v => roadmapStore.setGranularity(props.projectId, v)
})

// ── Chart bounds ────────────────────────────────────────────────────
const chartStart = computed<Date>(() => {
  if (!roadmap.value) { return new Date() }
  const all: Date[] = [
    ...roadmap.value.activities.map(a => a.startDate),
    ...roadmap.value.phases.map(p => p.startDate),
    ...roadmap.value.milestones.map(m => m.date)
  ]
  if (!all.length) {
    const d = new Date()
    d.setDate(1)
    return d
  }
  const min = new Date(Math.min(...all.map(d => d.getTime())))
  // Pad one unit to the left
  switch (granularity.value) {
    case 'day': min.setDate(min.getDate() - 1); break
    case 'week': min.setDate(min.getDate() - 7); break
    case 'month': min.setMonth(min.getMonth() - 1); break
    case 'quarter': min.setMonth(min.getMonth() - 3); break
  }
  return min
})

const chartEnd = computed<Date>(() => {
  if (!roadmap.value) { return new Date() }
  const all: Date[] = [
    ...roadmap.value.activities.map(a => a.endDate),
    ...roadmap.value.phases.map(p => p.endDate),
    ...roadmap.value.milestones.map(m => m.date)
  ]
  if (!all.length) {
    const d = new Date(chartStart.value)
    d.setMonth(d.getMonth() + 3)
    return d
  }
  const max = new Date(Math.max(...all.map(d => d.getTime())))
  switch (granularity.value) {
    case 'day': max.setDate(max.getDate() + 1); break
    case 'week': max.setDate(max.getDate() + 7); break
    case 'month': max.setMonth(max.getMonth() + 1); break
    case 'quarter': max.setMonth(max.getMonth() + 3); break
  }
  return max
})

const totalColumns = computed(() =>
  generateTimeUnits(chartStart.value, chartEnd.value, granularity.value).length
)

// ── Sorted data ─────────────────────────────────────────────────────
const sortedActivities = computed(() =>
  [...(roadmap.value?.activities ?? [])].sort((a, b) => a.order - b.order)
)

function milestonesForActivity (activityId: string): RoadmapMilestone[] {
  return (roadmap.value?.milestones ?? []).filter(m => m.activityId === activityId)
}

const standaloneMilestones = computed(() =>
  (roadmap.value?.milestones ?? []).filter(m => !m.activityId)
)

// ── Drag ────────────────────────────────────────────────────────────
type DragMode = 'move' | 'resize-left' | 'resize-right'
const dragActivityId = ref<string | null>(null)
const dragMode = ref<DragMode>('move')
const dragStartX = ref(0)
const dragOriginalActivity = ref<RoadmapActivity | null>(null)

const rowsEl = ref<HTMLElement | null>(null)
const headerScrollEl = ref<HTMLElement | null>(null)
const chartEl = ref<HTMLElement | null>(null)

function onDragStart (activityId: string, mode: DragMode, startX: number) {
  dragActivityId.value = activityId
  dragMode.value = mode
  dragStartX.value = startX
  dragOriginalActivity.value = roadmap.value!.activities.find(a => a.id === activityId) ?? null
}

function onMouseMove (e: MouseEvent) {
  if (!dragActivityId.value || !dragOriginalActivity.value || !roadmap.value) { return }

  const colWidth = COLUMN_WIDTH[granularity.value]
  const deltaCols = Math.round((e.clientX - dragStartX.value) / colWidth)
  if (deltaCols === 0) { return }

  const msPerCol = colWidth === COLUMN_WIDTH.day ? 86400000
    : colWidth === COLUMN_WIDTH.week ? 7 * 86400000
      : colWidth === COLUMN_WIDTH.month ? 30 * 86400000
        : 90 * 86400000

  const orig = dragOriginalActivity.value
  const ms = deltaCols * msPerCol

  let newStart = orig.startDate
  let newEnd = orig.endDate

  if (dragMode.value === 'move') {
    newStart = new Date(orig.startDate.getTime() + ms)
    newEnd = new Date(orig.endDate.getTime() + ms)
  } else if (dragMode.value === 'resize-left') {
    newStart = new Date(orig.startDate.getTime() + ms)
    if (newStart >= newEnd) { return }
  } else if (dragMode.value === 'resize-right') {
    newEnd = new Date(orig.endDate.getTime() + ms)
    if (newEnd <= newStart) { return }
  }

  const idx = roadmap.value.activities.findIndex(a => a.id === dragActivityId.value)
  if (idx !== -1) {
    roadmap.value.activities[idx] = { ...roadmap.value.activities[idx], startDate: newStart, endDate: newEnd }
  }
}

function onMouseUp () {
  if (!dragActivityId.value || !roadmap.value) {
    dragActivityId.value = null
    return
  }
  const updated = roadmap.value.activities.find(a => a.id === dragActivityId.value)
  if (updated) {
    roadmapStore.upsertActivity(props.projectId, updated)
  }
  dragActivityId.value = null
  dragOriginalActivity.value = null
}

function syncHeaderScroll (e: Event) {
  if (headerScrollEl.value) {
    headerScrollEl.value.scrollLeft = (e.target as HTMLElement).scrollLeft
  }
}

// ── Dialogs ─────────────────────────────────────────────────────────
const activityDialog = ref(false)
const phaseDialog = ref(false)
const milestoneDialog = ref(false)
const shiftDialog = ref(false)
const deleteDialog = ref(false)
const editingActivity = ref<RoadmapActivity | undefined>()
const editingPhase = ref<RoadmapPhase | undefined>()
const editingMilestone = ref<RoadmapMilestone | undefined>()
const pendingDeleteId = ref<string | null>(null)
const shiftDays = ref(0)

function openAddActivity () {
  editingActivity.value = undefined
  activityDialog.value = true
}

function onSaveActivity (activity: Omit<RoadmapActivity, 'order'>) {
  const existing = roadmap.value?.activities.find(a => a.id === activity.id)
  const order = existing?.order ?? (roadmap.value?.activities.length ?? 0)
  roadmapStore.upsertActivity(props.projectId, { ...activity, order })
}

function onSavePhase (phase: RoadmapPhase) {
  roadmapStore.upsertPhase(props.projectId, phase)
}

function onSaveMilestone (milestone: RoadmapMilestone) {
  roadmapStore.upsertMilestone(props.projectId, milestone)
}

function confirmDeleteActivity (id: string) {
  pendingDeleteId.value = id
  deleteDialog.value = true
}

function doDeleteActivity () {
  if (pendingDeleteId.value) {
    roadmapStore.deleteActivity(props.projectId, pendingDeleteId.value)
  }
  deleteDialog.value = false
  pendingDeleteId.value = null
}

function applyShift () {
  roadmapStore.shiftAll(props.projectId, shiftDays.value)
  shiftDays.value = 0
  shiftDialog.value = false
}
</script>

<style lang="sass">
.project-roadmap
  display: flex
  flex-direction: column
  overflow: hidden

.project-roadmap__chart
  display: flex
  flex-direction: column
  overflow: hidden
  user-select: none

.project-roadmap__chart-header
  display: flex
  position: sticky
  top: 0
  z-index: 5
  background: rgb(var(--v-theme-surface))

.project-roadmap__label-spacer
  width: 180px
  min-width: 180px
  border-right: 1px solid rgba(0,0,0,0.12)

.project-roadmap__header-scroll
  overflow: hidden   // synced programmatically from row scroll
  flex: 1

.project-roadmap__rows
  overflow: auto
  flex: 1
</style>
```

- [ ] **Step 2: Commit**

```bash
git add organizer-app/components/projects/roadmap/ProjectRoadmap.vue
git commit -m "feat(roadmap): add ProjectRoadmap root component"
```

---

## Task 14: Wire into Project Detail Page

**Files:**
- Modify: `organizer-app/pages/projects/[id].vue`

- [ ] **Step 1: Add import at top of `<script setup>` block**

Find the existing import block and add:

```typescript
import ProjectRoadmap from '~/components/projects/roadmap/ProjectRoadmap.vue'
```

- [ ] **Step 2: Add roadmap tab to `v-tabs`**

Find the `v-tabs` block (around line 109) and add after the `timeline` tab:

```pug
v-tab(value="roadmap")
  v-icon(start) mdi-chart-gantt
  | {{ $t('roadmap.title') }}
```

- [ ] **Step 3: Add roadmap window item**

Find the `v-window` block and add after the `timeline` window item:

```pug
v-window-item(value="roadmap")
  ProjectRoadmap(v-if="project" :project-id="project.id")
```

- [ ] **Step 4: Verify the dev server runs without errors**

```bash
cd organizer-app && make dev
```

Open `http://localhost:3000/projects/<any-project-id>` and click the Roadmap tab.
Expected: Roadmap tab visible, empty state shown, "+ Add" menu opens with Activity/Phase/Milestone options.

- [ ] **Step 5: Commit**

```bash
git add organizer-app/pages/projects/[id].vue
git commit -m "feat(roadmap): wire Roadmap tab into project detail page"
```

---

## Self-Review Checklist

After writing, verifying spec coverage:

| Spec requirement | Task |
|-----------------|------|
| Types: Roadmap, Phase, Activity, Milestone, ActivityLink | Task 1 |
| `Project.roadmapId` | Task 1 |
| Firestore security rule with userId | Task 2 |
| i18n en + nl | Task 3 |
| Store: fetch, create, save (debounced), shiftAll, upsert/delete | Task 4 |
| Store tests | Task 5 |
| Date↔column math, snap, generateTimeUnits | Task 6 |
| RoadmapMilestone: diamond + v-tooltip | Task 7 |
| RoadmapBar: drag events, link badge, context menu | Task 8 |
| RoadmapTimeAxis: sticky time headers | Task 9 |
| RoadmapPhaseHeader: sticky colored bands | Task 10 |
| RoadmapActivityRow: label + timeline layer | Task 11 |
| Dialog components: Activity, Phase, Milestone | Task 12 |
| ProjectRoadmap: toolbar (zoom, shift, add), drag state, chart layout | Task 13 |
| Project detail page: roadmap tab | Task 14 |
| Granularity persisted per project (via store/Firestore) | Task 4 + 13 |
| Milestones without activityId → standalone row | Task 11 + 13 |
| Right-click context menu on bar | Task 8 |
| Drag snaps to granularity unit | Task 13 (`onMouseMove` uses col-aligned math) |
| Link indicator on bar | Task 8 |
| Links popover | Task 8 |
