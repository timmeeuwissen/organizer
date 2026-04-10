# Project Timeline, Overview Sorting & Task Fixes — Design Spec

**Date:** 2026-04-10
**Status:** Approved

---

## Overview

Four related improvements to the Projects module:

1. **Project timeline** — a full audit trail on the project detail page showing changes to all related data
2. **Overview sorting** — user-selectable sort options on the projects overview
3. **Task deletion** — delete tasks directly from the project detail task table
4. **Task/UI fixes** — undo task completion via checkbox; smaller, less prominent action icons

---

## 1. Data Model

### New type: `AuditEvent`

Add to `types/models/index.ts`:

```ts
export interface AuditEvent {
  id: string
  projectId: string
  userId: string
  timestamp: Date
  entity: 'project' | 'task' | 'note' | 'meeting' | 'file' | 'mail'
  entityId: string
  entityTitle: string        // snapshot of entity name at time of event
  action: 'created' | 'updated' | 'deleted' | 'completed' | 'uncompleted' | 'linked' | 'unlinked'
  changes?: {                // only for 'updated' project-level events
    field: string
    from: string
    to: string
  }[]
}
```

Stored in Firestore subcollection: `projects/{projectId}/auditEvents`.

### Updated `Project` type

Add `lastActivity?: Date` to the `Project` interface. This field is denormalized — updated in the same `updateDoc` call whenever any audit event is written for the project. It enables overview sorting by last activity without loading subcollections.

### What gets recorded

| Trigger | Action | Entity |
|---|---|---|
| Project status/priority/title/members/tags change | `updated` with `changes[]` | `project` |
| Task added to project | `created` | `task` |
| Task deleted | `deleted` | `task` |
| Task marked complete | `completed` | `task` |
| Task un-completed | `uncompleted` | `task` |
| Note (ProjectPage) created | `created` | `note` |
| Note deleted | `deleted` | `note` |
| Meeting linked to project | `linked` | `meeting` |
| Meeting unlinked from project | `unlinked` | `meeting` |
| File uploaded | `created` | `file` |
| File deleted | `deleted` | `file` |
| Mail linked | `linked` | `mail` |
| Mail unlinked | `unlinked` | `mail` |

---

## 2. Store Changes

### `stores/projects.ts`

Add a private helper `writeAuditEvent(projectId: string, event: Omit<AuditEvent, 'id' | 'projectId' | 'userId' | 'timestamp'>)`:
- Writes a new document to `projects/{projectId}/auditEvents`
- In the same Firestore call, updates `lastActivity` on the project document via `updateDoc`
- Updates local state `projects[i].lastActivity` to keep the computed sort reactive

Add public action `fetchAuditEvents(projectId: string): Promise<AuditEvent[]>`:
- Queries `projects/{projectId}/auditEvents` ordered by `timestamp desc`, limit 100
- Returns the events (does not persist them to store state — the timeline component owns its local list)

Instrument existing `updateProject` action:
- After a successful `updateDoc`, diff the incoming `updates` against the previous project state
- For each changed field in `['status', 'priority', 'title', 'members', 'tags']`, call `writeAuditEvent` with `action: 'updated'` and a `changes` array entry

Instrument `createProjectPage` / `deleteProjectPage`:
- After success, call `writeAuditEvent` with `entity: 'note'`, `action: 'created'` or `'deleted'`

### `stores/tasks.ts`

No changes. Task audit events are written from the project detail page (see below), keeping the tasks store decoupled from project context.

### `stores/projectAttachments.ts`

No changes. File and mail audit events are written from the project detail page.

---

## 3. Project Detail Page (`pages/projects/[id].vue`)

After each successful mutation, call `projectsStore.writeAuditEvent(projectId, ...)`:

| Call site | Event written |
|---|---|
| `submitTask` — new task created | `entity: 'task', action: 'created', entityTitle: task.title` |
| `deleteTask` | `entity: 'task', action: 'deleted', entityTitle: task.title` |
| `toggleProjectTaskStatus` — to completed | `entity: 'task', action: 'completed', entityTitle: task.title` |
| `toggleProjectTaskStatus` — to inProgress | `entity: 'task', action: 'uncompleted', entityTitle: task.title` |
| `submitMeeting` — new meeting | `entity: 'meeting', action: 'linked', entityTitle: meeting.title` |
| `confirmRemoveMeeting` | `entity: 'meeting', action: 'unlinked', entityTitle: meeting.title` |
| `onProjectFileChange` — file uploaded | `entity: 'file', action: 'created', entityTitle: file.name` |
| `confirmRemoveFile` | `entity: 'file', action: 'deleted', entityTitle: file.name` |
| `confirmRemoveMailLink` | `entity: 'mail', action: 'unlinked', entityTitle: mail.subjectSnapshot` |

> **Note:** Mail *linking* happens from the mail module (outside the project detail page) and is not recorded in this iteration. Only unlinking is captured here.

Also add a new `deleteTask` action handler that calls `tasksStore.deleteTask(task.id)` directly from the table's `delete` emit, writes the audit event, and closes any open dialogs.

Add a new **Timeline** tab to the `v-tabs`:

```pug
v-tab(value="timeline") {{ $t('projects.timeline') }}
```

And the corresponding `v-window-item`:

```pug
v-window-item(value="timeline")
  ProjectTimeline(:project-id="projectId")
```

---

## 4. Timeline Component (`components/projects/ProjectTimeline.vue`)

A `v-timeline` (Vuetify dense vertical timeline) that loads on first render.

### Props
- `projectId: string`

### Behavior
- On mount (or when `projectId` changes), calls `projectsStore.fetchAuditEvents(projectId)` and stores the result locally
- Shows a `v-skeleton-loader` while loading
- Shows a friendly empty state ("No activity recorded yet") when the list is empty

### Event rendering

Each `AuditEvent` renders as a `v-timeline-item`:

| Property | Logic |
|---|---|
| **Icon** | `mdi-checkbox-marked` (task complete), `mdi-checkbox-blank-outline` (uncompleted), `mdi-plus-circle` (created), `mdi-delete` (deleted), `mdi-folder-cog` (project updated), `mdi-link` / `mdi-link-off` (linked/unlinked) |
| **Dot color** | green (created/completed/linked), red (deleted/unlinked), amber (updated), grey-blue (uncompleted) |
| **Title** | Descriptive sentence, e.g. *"Task completed"*, *"Status changed"*, *"File uploaded"* |
| **Subtitle** | `entityTitle` snapshot |
| **Change chips** | For `updated` project events: inline chips showing `field: from → to` |
| **Timestamp** | Relative (e.g. "2 hours ago") using a simple `formatRelativeTime` util; full ISO date on `title` tooltip |

---

## 5. Overview Sorting (`pages/projects/index.vue`)

### Sort options

| Label (i18n key) | Value | Logic |
|---|---|---|
| `projects.sortLastActivity` | `lastActivity` | `lastActivity ?? createdAt` desc |
| `projects.sortPriority` | `priority` | urgent=4 → low=1 desc |
| `projects.sortDueDate` | `dueDate` | soonest first, null last |
| `projects.sortCreatedDate` | `createdAt` | newest first |
| `projects.sortAlphabetical` | `title` | A → Z |
| `projects.sortProgress` | `progress` | highest first |
| `projects.sortTaskCount` | `taskCount` | `project.tasks.length` desc — total linked tasks, highest first (tasks store not loaded on overview) |

Default: `lastActivity`.

### UI

Add a `v-select` to the filter panel (below the status buttons, above the search field):

```pug
v-card(class="mb-4")
  v-card-title {{ $t('projects.sortBy') }}
  v-card-text
    v-select(
      v-model="sortBy"
      :items="sortOptions"
      item-title="label"
      item-value="value"
      density="compact"
      variant="outlined"
      hide-details
    )
```

The `filteredProjects` computed replaces the existing hard-coded priority sort with a switch on `sortBy.value`.

---

## 6. Task Table Fixes (`components/tasks/TasksOverviewTable.vue`)

### Undo task completion

Remove `:disabled="task.status === 'completed'"` from the `v-checkbox`. The `toggle-status` emit handler in the project detail page already calls `markInProgress` when the task is completed, so the round-trip logic is correct — only the UI was blocking it.

### Task deletion

Add a delete button to the last column's action group:

```pug
v-btn(
  icon
  size="x-small"
  variant="text"
  color="grey-darken-1"
  @click.stop="$emit('delete', task)"
)
  v-icon mdi-delete
```

Add `delete: [task: Task]` to `defineEmits`.

### Smaller, less prominent icons

Change all action buttons in the last column:
- `size="small"` → `size="x-small"`
- Remove explicit `color` (or set to `color="grey-darken-1"`)
- Add `variant="text"` to remove background fill

---

## 7. i18n Keys to Add

In `locales/en.ts` and `locales/nl.ts`:

```
projects.timeline
projects.noTimeline
projects.sortBy
projects.sortLastActivity
projects.sortPriority
projects.sortDueDate
projects.sortCreatedDate
projects.sortAlphabetical
projects.sortProgress
projects.sortTaskCount
```

---

## Files Changed

| File | Change type |
|---|---|
| `types/models/index.ts` | Add `AuditEvent` type; add `lastActivity` to `Project` |
| `stores/projects.ts` | Add `writeAuditEvent`, `fetchAuditEvents`; instrument `updateProject`, `createProjectPage`, `deleteProjectPage` |
| `pages/projects/index.vue` | Add sort control + computed sort logic |
| `pages/projects/[id].vue` | Add Timeline tab; wire audit event calls; add `deleteTask` handler |
| `components/projects/ProjectTimeline.vue` | New component |
| `components/tasks/TasksOverviewTable.vue` | Remove checkbox disabled; add delete emit; resize/decolor icons |
| `locales/en.ts` | New i18n keys |
| `locales/nl.ts` | New i18n keys |
