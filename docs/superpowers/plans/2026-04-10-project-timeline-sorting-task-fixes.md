# Project Timeline, Sorting & Task Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Firestore-backed project audit trail with timeline UI, user-selectable overview sorting, task deletion, checkbox undo of completion, and smaller/quieter task action icons.

**Architecture:** Audit events are written to a `projects/{id}/auditEvents` Firestore subcollection. A denormalized `lastActivity` field on the Project document enables overview sorting without extra queries. The timeline component loads events lazily when its tab is first opened. Task table fixes and sort changes are client-side only.

**Tech Stack:** Nuxt 4, Vue 3, Vuetify 3, Pinia, Firestore (Firebase), TypeScript, Pug templates, SASS, vue-i18n

---

## File Map

| File | Change type |
|---|---|
| `organizer-app/types/models/index.ts` | Add `AuditEvent` interface; add `lastActivity` to `Project` |
| `organizer-app/locales/en.ts` | Add sort and timeline i18n keys |
| `organizer-app/locales/nl.ts` | Add sort and timeline i18n keys (Dutch) |
| `organizer-app/stores/projects.ts` | Add `writeAuditEvent`, `fetchAuditEvents`; instrument project/note mutations |
| `organizer-app/components/projects/ProjectTimeline.vue` | New: timeline UI component |
| `organizer-app/pages/projects/[id].vue` | Add Timeline tab; wire audit events for tasks, meetings, files, mail; add confirm-delete-task handler |
| `organizer-app/components/tasks/TasksOverviewTable.vue` | Remove checkbox disabled; add delete button/emit; resize + neutralize action icons |
| `organizer-app/pages/projects/index.vue` | Add sortBy select + dynamic sort in filteredProjects |

---

### Task 1: Add AuditEvent type and lastActivity to Project

**Files:**
- Modify: `organizer-app/types/models/index.ts`

- [ ] **Step 1: Add AuditEvent interface**

In `organizer-app/types/models/index.ts`, after the `ProjectPage` interface (after line 153), add:

```typescript
export interface AuditEvent {
  id: string
  projectId: string
  userId: string
  timestamp: Date
  entity: 'project' | 'task' | 'note' | 'meeting' | 'file' | 'mail'
  entityId: string
  entityTitle: string
  action: 'created' | 'updated' | 'deleted' | 'completed' | 'uncompleted' | 'linked' | 'unlinked'
  changes?: {
    field: string
    from: string
    to: string
  }[]
}
```

- [ ] **Step 2: Add lastActivity to Project interface**

In the `Project` interface, add after the `updatedAt` field:

```typescript
  lastActivity?: Date
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing `AuditEvent` or `lastActivity`.

- [ ] **Step 4: Commit**

```bash
git add organizer-app/types/models/index.ts
git commit -m "feat(types): add AuditEvent interface and lastActivity to Project"
```

---

### Task 2: Add i18n keys

**Files:**
- Modify: `organizer-app/locales/en.ts`
- Modify: `organizer-app/locales/nl.ts`

- [ ] **Step 1: Add sort and noTimeline keys to en.ts projects section**

In `organizer-app/locales/en.ts`, inside the `projects` object, after the `priorityUrgent` line (line 472), add before the closing `}`:

```typescript
    noTimeline: 'No activity recorded yet',
    sortBy: 'Sort by',
    sortLastActivity: 'Last activity',
    sortPriority: 'Priority',
    sortDueDate: 'Due date',
    sortCreatedDate: 'Created date',
    sortAlphabetical: 'Alphabetical',
    sortProgress: 'Progress',
    sortTaskCount: 'Task count',
```

- [ ] **Step 2: Add timeline event keys to en.ts**

After the `projects` section closing brace and before `tasks:`, add a new top-level `timeline` section:

```typescript
  timeline: {
    taskAdded: 'Task added',
    taskDeleted: 'Task deleted',
    taskCompleted: 'Task completed',
    taskUncompleted: 'Task re-opened',
    noteAdded: 'Note added',
    noteDeleted: 'Note deleted',
    meetingLinked: 'Meeting linked',
    meetingUnlinked: 'Meeting unlinked',
    fileUploaded: 'File uploaded',
    fileDeleted: 'File deleted',
    mailUnlinked: 'Mail unlinked',
    projectUpdated: 'Project updated',
  },
```

- [ ] **Step 3: Add sort and noTimeline keys to nl.ts projects section**

In `organizer-app/locales/nl.ts`, inside `projects`, after `priorityUrgent`:

```typescript
    noTimeline: 'Nog geen activiteit geregistreerd',
    sortBy: 'Sorteren op',
    sortLastActivity: 'Laatste activiteit',
    sortPriority: 'Prioriteit',
    sortDueDate: 'Deadline',
    sortCreatedDate: 'Aanmaakdatum',
    sortAlphabetical: 'Alfabetisch',
    sortProgress: 'Voortgang',
    sortTaskCount: 'Aantal taken',
```

- [ ] **Step 4: Add timeline event keys to nl.ts**

After the `projects` section closing brace and before `tasks:`, add:

```typescript
  timeline: {
    taskAdded: 'Taak toegevoegd',
    taskDeleted: 'Taak verwijderd',
    taskCompleted: 'Taak voltooid',
    taskUncompleted: 'Taak heropend',
    noteAdded: 'Notitie toegevoegd',
    noteDeleted: 'Notitie verwijderd',
    meetingLinked: 'Vergadering gekoppeld',
    meetingUnlinked: 'Vergadering ontkoppeld',
    fileUploaded: 'Bestand geüpload',
    fileDeleted: 'Bestand verwijderd',
    mailUnlinked: 'E-mail ontkoppeld',
    projectUpdated: 'Project bijgewerkt',
  },
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add organizer-app/locales/en.ts organizer-app/locales/nl.ts
git commit -m "feat(i18n): add timeline event and sort i18n keys"
```

---

### Task 3: Add writeAuditEvent and fetchAuditEvents to projects store

**Files:**
- Modify: `organizer-app/stores/projects.ts`

- [ ] **Step 1: Add limit to Firestore imports**

In `organizer-app/stores/projects.ts`, update the `firebase/firestore` import to include `limit`:

```typescript
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  getFirestore
} from 'firebase/firestore'
```

- [ ] **Step 2: Add AuditEvent to type imports**

In `organizer-app/stores/projects.ts`, update the type import line:

```typescript
import type { Project, ProjectPage, AuditEvent } from '~/types/models'
```

- [ ] **Step 3: Add writeAuditEvent and fetchAuditEvents actions**

In the `actions` object, before the `fetchProjects` action, add both methods:

```typescript
async writeAuditEvent (
  projectId: string,
  event: {
    entity: AuditEvent['entity']
    entityId: string
    entityTitle: string
    action: AuditEvent['action']
    changes?: AuditEvent['changes']
  }
) {
  const authStore = useAuthStore()
  if (!authStore.user) { return }

  try {
    const db = getFirestore()
    const auditRef = collection(db, 'projects', projectId, 'auditEvents')
    const projectRef = doc(db, 'projects', projectId)

    await Promise.all([
      addDoc(auditRef, {
        projectId,
        userId: authStore.user.id,
        timestamp: serverTimestamp(),
        entity: event.entity,
        entityId: event.entityId,
        entityTitle: event.entityTitle,
        action: event.action,
        ...(event.changes ? { changes: event.changes } : {})
      }),
      updateDoc(projectRef, { lastActivity: serverTimestamp() })
    ])

    const now = new Date()
    const idx = this.projects.findIndex(p => p.id === projectId)
    if (idx !== -1) { this.projects[idx].lastActivity = now }
    if (this.currentProject?.id === projectId) { this.currentProject.lastActivity = now }
  } catch (error) {
    // Audit failures must not block the main operation
    console.warn('[audit] failed to write audit event', error)
  }
},

async fetchAuditEvents (projectId: string): Promise<AuditEvent[]> {
  const authStore = useAuthStore()
  if (!authStore.user) { return [] }

  try {
    const db = getFirestore()
    const auditRef = collection(db, 'projects', projectId, 'auditEvents')
    const q = query(auditRef, orderBy('timestamp', 'desc'), limit(100))
    const snap = await getDocs(q)

    return snap.docs.map((d) => {
      const data = d.data()
      return {
        ...data,
        id: d.id,
        timestamp: data.timestamp?.toDate() || new Date()
      } as AuditEvent
    })
  } catch (error) {
    console.warn('[audit] failed to fetch audit events', error)
    return []
  }
},
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add organizer-app/stores/projects.ts
git commit -m "feat(store): add writeAuditEvent and fetchAuditEvents to projects store"
```

---

### Task 4: Instrument store for project and note audit events

**Files:**
- Modify: `organizer-app/stores/projects.ts`

- [ ] **Step 1: Capture before-state and diff in updateProject**

In `organizer-app/stores/projects.ts`, in the `updateProject` action, after the line `const projectData = projectSnap.data()` (ownership check) and before the `const updateData` line, add:

```typescript
// Capture state before update for audit diff
const beforeProject = this.projects.find(p => p.id === id)
```

After the `await updateDoc(projectRef, updateData)` line, add:

```typescript
// Write audit event for meaningful field changes
const watchedFields = ['status', 'priority', 'title', 'members', 'tags'] as const
type WatchedField = typeof watchedFields[number]
const auditChanges: NonNullable<AuditEvent['changes']> = []
const serialize = (val: unknown): string =>
  Array.isArray(val) ? (val as string[]).join(', ') : String(val ?? '')
for (const field of watchedFields) {
  if (!(field in updates)) { continue }
  const fromStr = serialize(beforeProject?.[field as WatchedField])
  const toStr = serialize(updates[field as WatchedField])
  if (fromStr !== toStr) {
    auditChanges.push({ field, from: fromStr, to: toStr })
  }
}
if (auditChanges.length > 0) {
  await this.writeAuditEvent(id, {
    entity: 'project',
    entityId: id,
    entityTitle: String(updates.title ?? beforeProject?.title ?? id),
    action: 'updated',
    changes: auditChanges
  })
}
```

- [ ] **Step 2: Instrument createProjectPage**

In `createProjectPage`, after `await this.updateProject(projectId, { pages: updatedPages })`, add:

```typescript
await this.writeAuditEvent(projectId, {
  entity: 'note',
  entityId: docRef.id,
  entityTitle: newPage.title || 'Note',
  action: 'created'
})
```

- [ ] **Step 3: Instrument deleteProjectPage**

In `deleteProjectPage`, the local variable `pageData` holds the Firestore snapshot data. After `await deleteDoc(pageRef)`, add:

```typescript
await this.writeAuditEvent(project.id, {
  entity: 'note',
  entityId: id,
  entityTitle: pageData.title || 'Note',
  action: 'deleted'
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add organizer-app/stores/projects.ts
git commit -m "feat(store): instrument project and note mutations with audit events"
```

---

### Task 5: Create ProjectTimeline component

**Files:**
- Create: `organizer-app/components/projects/ProjectTimeline.vue`

- [ ] **Step 1: Create the component**

```vue
<template lang="pug">
v-card(elevation="1" class="mt-4")
  v-card-text
    div(v-if="loading")
      v-skeleton-loader(type="list-item-avatar-two-line" v-for="i in 5" :key="i" class="mb-2")

    v-alert(
      v-else-if="events.length === 0"
      type="info"
      variant="tonal"
      class="mt-2"
    ) {{ $t('projects.noTimeline') }}

    v-timeline(
      v-else
      side="end"
      density="compact"
      truncate-line="both"
    )
      v-timeline-item(
        v-for="event in events"
        :key="event.id"
        :dot-color="getDotColor(event.action)"
        size="x-small"
      )
        template(v-slot:icon)
          v-icon(size="x-small" color="white") {{ getIcon(event) }}
        .d-flex.justify-space-between.align-start
          div
            .text-body-2.font-weight-medium {{ getTitle(event) }}
            .text-caption.text-medium-emphasis {{ event.entityTitle }}
            .mt-1(v-if="event.changes && event.changes.length > 0")
              v-chip(
                v-for="change in event.changes"
                :key="change.field"
                size="x-small"
                class="mr-1"
              ) {{ change.field }}: {{ change.from }} → {{ change.to }}
          .text-caption.text-medium-emphasis.ml-4.flex-shrink-0(
            :title="formatFullDate(event.timestamp)"
          ) {{ formatRelativeTime(event.timestamp) }}
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectsStore } from '~/stores/projects'
import type { AuditEvent } from '~/types/models'

const props = defineProps<{ projectId: string }>()
const { t } = useI18n()
const projectsStore = useProjectsStore()

const loading = ref(false)
const events = ref<AuditEvent[]>([])

const load = async (id: string) => {
  loading.value = true
  events.value = await projectsStore.fetchAuditEvents(id)
  loading.value = false
}

watch(() => props.projectId, (id) => { if (id) { void load(id) } }, { immediate: true })

const getDotColor = (action: AuditEvent['action']): string => {
  switch (action) {
    case 'created': case 'completed': case 'linked': return 'success'
    case 'deleted': case 'unlinked': return 'error'
    case 'updated': return 'warning'
    case 'uncompleted': return 'info'
    default: return 'grey'
  }
}

const getIcon = (event: AuditEvent): string => {
  if (event.action === 'completed') { return 'mdi-checkbox-marked' }
  if (event.action === 'uncompleted') { return 'mdi-checkbox-blank-outline' }
  if (event.action === 'deleted') { return 'mdi-delete' }
  if (event.action === 'linked') { return 'mdi-link' }
  if (event.action === 'unlinked') { return 'mdi-link-off' }
  if (event.action === 'updated' && event.entity === 'project') { return 'mdi-folder-cog' }
  switch (event.entity) {
    case 'task': return 'mdi-plus-circle'
    case 'note': return 'mdi-note-plus'
    case 'file': return 'mdi-file-plus'
    case 'meeting': return 'mdi-calendar-plus'
    default: return 'mdi-information'
  }
}

const getTitle = (event: AuditEvent): string => {
  const map: Record<string, string> = {
    'task-created': t('timeline.taskAdded'),
    'task-deleted': t('timeline.taskDeleted'),
    'task-completed': t('timeline.taskCompleted'),
    'task-uncompleted': t('timeline.taskUncompleted'),
    'note-created': t('timeline.noteAdded'),
    'note-deleted': t('timeline.noteDeleted'),
    'meeting-linked': t('timeline.meetingLinked'),
    'meeting-unlinked': t('timeline.meetingUnlinked'),
    'file-created': t('timeline.fileUploaded'),
    'file-deleted': t('timeline.fileDeleted'),
    'mail-unlinked': t('timeline.mailUnlinked'),
    'project-updated': t('timeline.projectUpdated')
  }
  return map[`${event.entity}-${event.action}`] || `${event.entity} ${event.action}`
}

const formatRelativeTime = (date: Date): string => {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) { return 'just now' }
  if (minutes < 60) { return `${minutes}m ago` }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) { return `${hours}h ago` }
  const days = Math.floor(hours / 24)
  if (days < 7) { return `${days}d ago` }
  return formatFullDate(date)
}

const formatFullDate = (date: Date): string => new Date(date).toLocaleString()
</script>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add organizer-app/components/projects/ProjectTimeline.vue
git commit -m "feat(components): add ProjectTimeline component"
```

---

### Task 6: Add Timeline tab to project detail page

**Files:**
- Modify: `organizer-app/pages/projects/[id].vue`

- [ ] **Step 1: Import ProjectTimeline in the script**

In the `<script setup lang="ts">` section, add to the imports:

```typescript
import ProjectTimeline from '~/components/projects/ProjectTimeline.vue'
```

- [ ] **Step 2: Add Timeline tab to v-tabs**

Find the `v-tabs` block (around line 109):

```pug
v-tabs(v-model="activeTab")
  v-tab(value="tasks") {{ $t('projects.tasks') }}
  v-tab(value="notes") {{ $t('projects.notes') }}
  v-tab(value="meetings") {{ $t('projects.meetings') }}
  v-tab(value="links") {{ $t('projects.links') }}
  v-tab(value="files") {{ $t('projects.files') }}
  v-tab(value="mail") {{ $t('projects.connectedMail') }}
  v-tab(value="knowledge") {{ $t('knowledge.title') }}
```

Add the timeline tab at the end:

```pug
v-tabs(v-model="activeTab")
  v-tab(value="tasks") {{ $t('projects.tasks') }}
  v-tab(value="notes") {{ $t('projects.notes') }}
  v-tab(value="meetings") {{ $t('projects.meetings') }}
  v-tab(value="links") {{ $t('projects.links') }}
  v-tab(value="files") {{ $t('projects.files') }}
  v-tab(value="mail") {{ $t('projects.connectedMail') }}
  v-tab(value="knowledge") {{ $t('knowledge.title') }}
  v-tab(value="timeline") {{ $t('projects.timeline') }}
```

- [ ] **Step 3: Add Timeline window item**

In the `v-window` block, after the knowledge `v-window-item`, add:

```pug
v-window-item(value="timeline")
  ProjectTimeline(v-if="project" :project-id="projectId")
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add organizer-app/pages/projects/[id].vue
git commit -m "feat(projects): add Timeline tab to project detail page"
```

---

### Task 7: Wire task and meeting audit events; add confirmDeleteTask

**Files:**
- Modify: `organizer-app/pages/projects/[id].vue`

- [ ] **Step 1: Wire audit event for new task creation in submitTask**

In `submitTask`, find the `else` branch (new task, not update). After `notify.pushSuccess(t('common.save'))` and before `taskDialog.value = false`, add:

```typescript
const createdTask = tasksStore.getById(createdId)
if (project.value && createdTask) {
  await projectsStore.writeAuditEvent(project.value.id, {
    entity: 'task',
    entityId: createdId,
    entityTitle: createdTask.title,
    action: 'created'
  })
}
```

- [ ] **Step 2: Replace toggleProjectTaskStatus with audit-instrumented version**

Find the `toggleProjectTaskStatus` function (around line 743) and replace the entire function:

```typescript
const toggleProjectTaskStatus = async (task: Task) => {
  if (task.status === 'completed') {
    await tasksStore.markInProgress(task.id)
    notify.pushSuccess(t('common.update'))
    if (project.value) {
      await projectsStore.writeAuditEvent(project.value.id, {
        entity: 'task',
        entityId: task.id,
        entityTitle: task.title,
        action: 'uncompleted'
      })
    }
    return
  }
  await tasksStore.markComplete(task.id)
  notify.pushSuccess(t('tasks.markComplete'))
  if (project.value) {
    await projectsStore.writeAuditEvent(project.value.id, {
      entity: 'task',
      entityId: task.id,
      entityTitle: task.title,
      action: 'completed'
    })
  }
}
```

- [ ] **Step 3: Add confirmDeleteTask after deleteTask function**

After the existing `deleteTask` function (around line 724), add:

```typescript
const confirmDeleteTask = (task: Task) => {
  confirmDialog.title = t('common.delete')
  confirmDialog.text = task.title
  pendingConfirm = async () => {
    await tasksStore.deleteTask(task.id)
    if (project.value) {
      await projectsStore.writeAuditEvent(project.value.id, {
        entity: 'task',
        entityId: task.id,
        entityTitle: task.title,
        action: 'deleted'
      })
    }
    notify.pushSuccess(t('common.delete'))
  }
  confirmDialog.open = true
}
```

- [ ] **Step 4: Wire delete emit on TasksOverviewTable in the template**

Find the `TasksOverviewTable` component in the template:

```pug
TasksOverviewTable(
  :tasks="projectTasks"
  :loading="taskLoading || loading"
  :show-hierarchy="true"
  @open="openProjectTask"
  @edit="openProjectTask"
  @toggle-status="toggleProjectTaskStatus"
  @add-subtask="addProjectSubtask"
)
```

Add the delete handler:

```pug
TasksOverviewTable(
  :tasks="projectTasks"
  :loading="taskLoading || loading"
  :show-hierarchy="true"
  @open="openProjectTask"
  @edit="openProjectTask"
  @toggle-status="toggleProjectTaskStatus"
  @add-subtask="addProjectSubtask"
  @delete="confirmDeleteTask"
)
```

- [ ] **Step 5: Wire meeting audit events in submitMeeting**

Find `submitMeeting`. Inside the `else` branch (creating a new meeting), after `notify.pushSuccess(t('common.save'))` and before `meetingDialog.value = false`, add:

```typescript
if (project.value) {
  const meetingPayload = meetingFormToMeetingPayload(meetingData)
  await projectsStore.writeAuditEvent(project.value.id, {
    entity: 'meeting',
    entityId: '',
    entityTitle: meetingPayload.title || meetingPayload.subject || t('common.unknown'),
    action: 'linked'
  })
}
```

- [ ] **Step 6: Wire meeting audit event in confirmRemoveMeeting**

Find `confirmRemoveMeeting`. Inside `pendingConfirm`, after `await meetingsStore.deleteMeeting(meeting.id)`, add:

```typescript
if (project.value) {
  await projectsStore.writeAuditEvent(project.value.id, {
    entity: 'meeting',
    entityId: meeting.id,
    entityTitle: meetingDisplayTitle(meeting),
    action: 'unlinked'
  })
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 8: Commit**

```bash
git add organizer-app/pages/projects/[id].vue
git commit -m "feat(projects): wire task and meeting audit events; add confirmDeleteTask"
```

---

### Task 8: Wire file and mail audit events in project detail page

**Files:**
- Modify: `organizer-app/pages/projects/[id].vue`

- [ ] **Step 1: Wire file upload audit event in onProjectFileChange**

In `onProjectFileChange`, after `notify.pushSuccess(t('projects.fileUploaded'))`, add:

```typescript
await projectsStore.writeAuditEvent(pid, {
  entity: 'file',
  entityId: file.name,
  entityTitle: file.name,
  action: 'created'
})
```

- [ ] **Step 2: Wire file delete audit event in confirmRemoveFile**

In `confirmRemoveFile`, inside `pendingConfirm`, after `await attachmentsStore.deleteFile(projectId.value, f)`, add:

```typescript
await projectsStore.writeAuditEvent(projectId.value, {
  entity: 'file',
  entityId: f.id,
  entityTitle: f.name,
  action: 'deleted'
})
```

- [ ] **Step 3: Wire mail unlink audit event in confirmRemoveMailLink**

In `confirmRemoveMailLink`, inside `pendingConfirm`, after `await attachmentsStore.deleteMailLink(...)`, add:

```typescript
await projectsStore.writeAuditEvent(projectId.value, {
  entity: 'mail',
  entityId: row.emailId,
  entityTitle: row.subjectSnapshot || row.emailId,
  action: 'unlinked'
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add organizer-app/pages/projects/[id].vue
git commit -m "feat(projects): wire file and mail audit events in project detail"
```

---

### Task 9: Fix TasksOverviewTable — checkbox undo, delete button, icon sizing

**Files:**
- Modify: `organizer-app/components/tasks/TasksOverviewTable.vue`

- [ ] **Step 1: Remove disabled from checkbox**

Find (around line 23):

```pug
v-checkbox(
  :model-value="task.status === 'completed'"
  color="success"
  @click.stop="$emit('toggle-status', task)"
  :disabled="task.status === 'completed'"
)
```

Replace with (remove the `:disabled` line):

```pug
v-checkbox(
  :model-value="task.status === 'completed'"
  color="success"
  @click.stop="$emit('toggle-status', task)"
)
```

- [ ] **Step 2: Replace action buttons — resize, neutralize, add delete**

Find the last column (around line 80):

```pug
td(style="width: 160px")
  v-btn(icon size="small" color="primary" @click.stop="$emit('edit', task)")
    v-icon mdi-pencil
  v-btn(
    v-if="task.status !== 'completed'"
    icon
    size="small"
    @click.stop="$emit('toggle-status', task)"
    color="success"
  )
    v-icon mdi-check
  v-btn(
    v-if="!task.hasSubtasks"
    icon
    size="small"
    @click.stop="$emit('add-subtask', task)"
    color="info"
  )
    v-icon mdi-plus-circle-outline
```

Replace with:

```pug
td(style="width: 160px")
  v-btn(icon size="x-small" variant="text" color="grey-darken-1" @click.stop="$emit('edit', task)")
    v-icon mdi-pencil
  v-btn(
    v-if="task.status !== 'completed'"
    icon
    size="x-small"
    variant="text"
    color="grey-darken-1"
    @click.stop="$emit('toggle-status', task)"
  )
    v-icon mdi-check
  v-btn(
    v-if="!task.hasSubtasks"
    icon
    size="x-small"
    variant="text"
    color="grey-darken-1"
    @click.stop="$emit('add-subtask', task)"
  )
    v-icon mdi-plus-circle-outline
  v-btn(
    icon
    size="x-small"
    variant="text"
    color="grey-darken-1"
    @click.stop="$emit('delete', task)"
  )
    v-icon mdi-delete
```

- [ ] **Step 3: Add delete to defineEmits**

Find:

```typescript
defineEmits<{
  open: [task: Task]
  edit: [task: Task]
  'toggle-status': [task: Task]
  'add-subtask': [task: Task]
}>()
```

Replace with:

```typescript
defineEmits<{
  open: [task: Task]
  edit: [task: Task]
  'toggle-status': [task: Task]
  'add-subtask': [task: Task]
  delete: [task: Task]
}>()
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add organizer-app/components/tasks/TasksOverviewTable.vue
git commit -m "fix(tasks): enable checkbox undo, add delete button, reduce icon prominence"
```

---

### Task 10: Add sort control to projects overview

**Files:**
- Modify: `organizer-app/pages/projects/index.vue`

- [ ] **Step 1: Add sortBy ref and sortOptions computed**

In the script section, after `const selectedTags = ref<string[]>([])`, add:

```typescript
const sortBy = ref('lastActivity')

const sortOptions = computed(() => [
  { label: t('projects.sortLastActivity'), value: 'lastActivity' },
  { label: t('projects.sortPriority'), value: 'priority' },
  { label: t('projects.sortDueDate'), value: 'dueDate' },
  { label: t('projects.sortCreatedDate'), value: 'createdAt' },
  { label: t('projects.sortAlphabetical'), value: 'title' },
  { label: t('projects.sortProgress'), value: 'progress' },
  { label: t('projects.sortTaskCount'), value: 'taskCount' }
])
```

- [ ] **Step 2: Replace the hard-coded priority sort in filteredProjects**

Find:

```typescript
const rank: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 }
result.sort((a, b) => (rank[a.priority] || 99) - (rank[b.priority] || 99))
```

Replace with:

```typescript
const priorityRank: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 }

switch (sortBy.value) {
  case 'priority':
    result.sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))
    break
  case 'dueDate':
    result.sort((a, b) => {
      if (!a.dueDate) { return 1 }
      if (!b.dueDate) { return -1 }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    break
  case 'createdAt':
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    break
  case 'title':
    result.sort((a, b) => a.title.localeCompare(b.title))
    break
  case 'progress':
    result.sort((a, b) => (b.progress || 0) - (a.progress || 0))
    break
  case 'taskCount':
    result.sort((a, b) => (b.tasks?.length || 0) - (a.tasks?.length || 0))
    break
  case 'lastActivity':
  default:
    result.sort((a, b) => {
      const aTime = new Date(a.lastActivity ?? a.createdAt).getTime()
      const bTime = new Date(b.lastActivity ?? b.createdAt).getTime()
      return bTime - aTime
    })
    break
}
```

- [ ] **Step 3: Add sort select to the filter panel template**

In the template, find the status filter card:

```pug
v-card(class="mb-4")
  v-card-title {{ $t('projects.status') }}
  ...
```

Insert a new sort card before it (as the first card in the filter panel):

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

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd organizer-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Manual smoke test**

```bash
cd organizer-app && make dev
```

Open http://localhost:3000/projects and verify:
- Sort select appears in the filter panel
- Switching to "Alphabetical" re-orders the project cards
- Default "Last activity" sort works (projects without `lastActivity` fall back to `createdAt`)

- [ ] **Step 6: Commit**

```bash
git add organizer-app/pages/projects/index.vue
git commit -m "feat(projects): add user-selectable sort options to overview"
```

---

## Self-Review

**Spec coverage:**
- ✅ `AuditEvent` type + `lastActivity` on `Project` — Task 1
- ✅ i18n keys for sort options and timeline event labels — Task 2
- ✅ `writeAuditEvent` + `fetchAuditEvents` store actions — Task 3
- ✅ Project field change diffs (`status`, `priority`, `title`, `members`, `tags`) — Task 4
- ✅ Note create/delete audit events — Task 4
- ✅ `ProjectTimeline` component with v-timeline, icons, dot colors, change chips, relative timestamp — Task 5
- ✅ Timeline tab wired into project detail page — Task 6
- ✅ Task create/complete/uncomplete audit events — Task 7
- ✅ `confirmDeleteTask` handler + `@delete` emit wired on `TasksOverviewTable` — Task 7
- ✅ Meeting linked/unlinked audit events — Task 7
- ✅ File uploaded/deleted audit events — Task 8
- ✅ Mail unlinked audit event — Task 8
- ✅ Checkbox undo of task completion — Task 9
- ✅ Delete button in task table — Task 9
- ✅ Smaller/neutral action icons — Task 9
- ✅ Sort control in projects overview with all 7 sort options — Task 10

**Type consistency across tasks:**
- `AuditEvent` defined Task 1 → imported in Task 3 (store) and Task 5 (component) ✅
- `writeAuditEvent(projectId, event)` signature defined Task 3 → called in Task 4 (store), Task 7, Task 8 (page) ✅
- `fetchAuditEvents(projectId)` defined Task 3 → called in Task 5 (component) ✅
- `delete: [task: Task]` emit defined Task 9 → handled via `@delete="confirmDeleteTask"` wired Task 7 ✅
- `confirmDeleteTask(task)` defined Task 7 → wired in template Task 7 ✅
- `sortBy` ref and `sortOptions` computed defined Task 10 → used in sort switch and template Task 10 ✅
