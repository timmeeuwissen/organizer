# Track 3: Phase 2 UX Compliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All 13 modules follow the GUI rules: unsaved-changes guard wired into all forms, AdminCard (data model + CSV export) on all overview pages, delete-with-references confirmation dialog.

**Architecture:**
- Unsaved changes: `plugins/unsaved-navigation.client.ts` + `composables/useUnsavedChanges.ts` already handle the router guard. Missing piece: form components must call `setNavigationDirty(true)` on field change and `setNavigationDirty(false)` on save/cancel.
- AdminCard: new `components/common/AdminCard.vue` placed in each module's overview page.
- Delete with references: new `composables/useDeleteWithReferences.ts`, used in delete handlers across all modules.

**Note:** Breadcrumbs are **already done** — `AppBreadcrumbs.vue` is wired into the layout.

**Working directory for all commands:** `organizer-app/`

---

## Task 1: Wire unsaved-changes flag into BehaviorForm

**Files:**
- Modify: `components/behaviors/BehaviorForm.vue`

The guard plugin is already active. We just need forms to call `setNavigationDirty(true)` when any field changes.

- [ ] **Step 1: Read the current script section**

```bash
grep -n "script\|setup\|ref\|defineEmits\|watch" components/behaviors/BehaviorForm.vue
```

- [ ] **Step 2: Add import and dirty tracking**

In the `<script setup lang="ts">` block, add the import:
```typescript
const { setNavigationDirty } = useUnsavedChanges()
```

(Nuxt auto-imports `useUnsavedChanges` from composables — no explicit import needed.)

- [ ] **Step 3: Watch form fields for changes**

After the reactive refs for form fields are declared, add a watch that marks dirty when any field changes:

```typescript
// Mark navigation dirty when form fields change
watch(
  [type, title, rationale, examples, categories],
  () => { setNavigationDirty(true) },
  { deep: true }
)
```

(Adjust the watched refs to match the actual ref names in the file.)

- [ ] **Step 4: Clear dirty flag on submit and cancel**

In the `submit` function, add `setNavigationDirty(false)` before `emit('submit', ...)`.

If there is a cancel/close action or a `@click="$emit('cancel')"`, also call `setNavigationDirty(false)` there.

- [ ] **Step 5: Commit**

```bash
cd organizer-app && git add components/behaviors/BehaviorForm.vue && git commit -m "feat(behaviors): wire unsaved-changes guard into BehaviorForm

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 2: Wire unsaved-changes into all other form components

Apply the exact same pattern (Task 1 steps 2–4) to each form component below. For each:
1. Read the file to find ref names
2. Add `const { setNavigationDirty } = useUnsavedChanges()`
3. Add `watch([...formRefs], () => setNavigationDirty(true), { deep: true })`
4. Add `setNavigationDirty(false)` before every `emit('submit', ...)` and on cancel

**Files to update:**
- `components/calendar/CalendarEventForm.vue`
- `components/coaching/CoachingForm.vue`
- `components/knowledge/KnowledgeNodeForm.vue`
- `components/mail/MailComposeForm.vue`
- `components/meetings/MeetingForm.vue`
- `components/people/PersonForm.vue`
- `components/projects/ProjectForm.vue`
- `components/tasks/TaskForm.vue`

- [ ] **Step 1: Update CalendarEventForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/calendar/CalendarEventForm.vue | head -20
```

Add dirty tracking as per Task 1 pattern.

- [ ] **Step 2: Update CoachingForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/coaching/CoachingForm.vue | head -20
```

- [ ] **Step 3: Update KnowledgeNodeForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/knowledge/KnowledgeNodeForm.vue | head -20
```

- [ ] **Step 4: Update MailComposeForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/mail/MailComposeForm.vue | head -20
```

- [ ] **Step 5: Update MeetingForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/meetings/MeetingForm.vue | head -20
```

- [ ] **Step 6: Update PersonForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/people/PersonForm.vue | head -20
```

- [ ] **Step 7: Update ProjectForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/projects/ProjectForm.vue | head -20
```

- [ ] **Step 8: Update TaskForm.vue**

```bash
grep -n "const\s\+[a-z].*= ref\|defineEmits\|emit(" components/tasks/TaskForm.vue | head -20
```

- [ ] **Step 9: Commit all form updates**

```bash
cd organizer-app && git add components/ && git commit -m "feat(forms): wire unsaved-changes guard into all module forms

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 3: Create AdminCard component

**Files:**
- Create: `components/common/AdminCard.vue`

The AdminCard shows two icon buttons on every overview page:
- Data model icon (`mdi-code-json`): opens a dialog showing the TypeScript interface as JSON
- Export icon (`mdi-export-variant`): downloads current table data as CSV

- [ ] **Step 1: Write the component**

Create `components/common/AdminCard.vue`:

```vue
<template lang="pug">
div
  v-btn(
    icon
    variant="text"
    size="small"
    :title="$t('common.dataModel')"
    @click="showModel = true"
  )
    v-icon mdi-code-json
  v-btn(
    icon
    variant="text"
    size="small"
    :title="$t('common.exportCsv')"
    @click="exportCsv"
  )
    v-icon mdi-export-variant

  v-dialog(v-model="showModel" max-width="700")
    v-card
      v-card-title {{ $t('common.dataModel') }}
      v-card-text
        pre.text-body-2(style="white-space: pre-wrap; word-break: break-all;") {{ modelDisplay }}
      v-card-actions
        v-spacer
        v-btn(@click="showModel = false") {{ $t('common.close') }}
</template>

<script setup lang="ts">
const props = defineProps<{
  /** Human-readable model interface string to display in the dialog */
  modelInterface: string
  /** Array of records to export as CSV */
  exportData: Record<string, unknown>[]
  /** Filename without extension for the CSV download */
  exportFilename?: string
}>()

const showModel = ref(false)

const modelDisplay = computed(() => props.modelInterface)

function exportCsv() {
  if (!props.exportData.length) return
  const headers = Object.keys(props.exportData[0])
  const rows = props.exportData.map(row =>
    headers.map(h => {
      const v = row[h]
      const s = v === null || v === undefined ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.exportFilename ?? 'export'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
```

- [ ] **Step 2: Add i18n keys**

Open `locales/en.ts` and add these keys inside the `common` section:
```typescript
dataModel: 'Data model',
exportCsv: 'Export CSV',
```

Open `locales/nl.ts` and add:
```typescript
dataModel: 'Datamodel',
exportCsv: 'Exporteer CSV',
```

- [ ] **Step 3: Commit the component**

```bash
cd organizer-app && git add components/common/AdminCard.vue locales/ && git commit -m "feat(common): add AdminCard component with data model and CSV export

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 4: Add AdminCard to all overview pages

For each of the 13 module overview pages below, add `AdminCard` to the page toolbar area.

**Pages to update:**
`pages/behaviors/index.vue`, `pages/calendar/index.vue`, `pages/coaching/index.vue`, `pages/feedback/index.vue`, `pages/mail/index.vue`, `pages/meetings/index.vue`, `pages/network/index.vue`, `pages/people/index.vue`, `pages/projects/index.vue`, `pages/statistics/index.vue`, `pages/tasks/index.vue`, `pages/teams/index.vue`, `pages/dashboard/index.vue`

For each page:

1. Read the page to find the main `v-container` and the heading area
2. Add the AdminCard next to the page heading, using the store's item array for `exportData`
3. Pass a `modelInterface` string describing the type

Example for `pages/behaviors/index.vue`:

```pug
// After the h1 heading in the template, add:
AdminCard(
  model-interface="interface Behavior { id: string; type: string; title: string; rationale: string; examples: string[]; categories: string[] }"
  :export-data="behaviors"
  export-filename="behaviors"
)
```

- [ ] **Step 1: Add AdminCard to behaviors/index.vue**

Read the file, find the heading row, add AdminCard there.

- [ ] **Step 2: Add AdminCard to coaching/index.vue**

Read the file, find the heading, add AdminCard.

- [ ] **Step 3: Add AdminCard to feedback/index.vue**

- [ ] **Step 4: Add AdminCard to meetings/index.vue**

- [ ] **Step 5: Add AdminCard to people/index.vue**

- [ ] **Step 6: Add AdminCard to projects/index.vue**

- [ ] **Step 7: Add AdminCard to tasks/index.vue**

- [ ] **Step 8: Add AdminCard to teams/index.vue**

- [ ] **Step 9: Add AdminCard to calendar/index.vue**

- [ ] **Step 10: Add AdminCard to mail/index.vue**

- [ ] **Step 11: Add AdminCard to network/index.vue**

- [ ] **Step 12: Add AdminCard to statistics/index.vue**

- [ ] **Step 13: Add AdminCard to dashboard/index.vue** (use any top-level items or skip exportData=[])

- [ ] **Step 14: Commit**

```bash
cd organizer-app && git add pages/ && git commit -m "feat: add AdminCard to all module overview pages

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 5: Create useDeleteWithReferences composable

**Files:**
- Create: `composables/useDeleteWithReferences.ts`

This composable checks whether a record is referenced by other collections before deletion.

- [ ] **Step 1: Write the composable**

Create `composables/useDeleteWithReferences.ts`:

```typescript
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'

export interface ReferenceInfo {
  module: string
  routePath: string
  count: number
  filterParam: string
  filterValue: string
}

/** Map of which collections reference which, and how. */
const REFERENCE_MAP: Record<string, Array<{
  collection: string
  field: string
  module: string
  routePath: string
  filterParam: string
}>> = {
  people: [
    { collection: 'tasks', field: 'assigneeId', module: 'Tasks', routePath: '/tasks', filterParam: 'assignee' },
    { collection: 'meetings', field: 'attendees', module: 'Meetings', routePath: '/meetings', filterParam: 'attendee' },
  ],
  projects: [
    { collection: 'tasks', field: 'projectId', module: 'Tasks', routePath: '/tasks', filterParam: 'project' },
    { collection: 'meetings', field: 'relatedProjectIds', module: 'Meetings', routePath: '/meetings', filterParam: 'project' },
  ],
  teams: [
    { collection: 'projects', field: 'teamId', module: 'Projects', routePath: '/projects', filterParam: 'team' },
  ],
  meetings: [
    { collection: 'coaching', field: 'meetingId', module: 'Coaching', routePath: '/coaching', filterParam: 'meeting' },
  ],
}

export function useDeleteWithReferences() {
  const db = getFirestore()
  const authStore = useAuthStore()
  const showDialog = ref(false)
  const references = ref<ReferenceInfo[]>([])
  const pendingDeleteFn = ref<(() => Promise<void>) | null>(null)

  async function checkAndDelete(
    entityType: string,
    entityId: string,
    deleteFn: () => Promise<void>
  ) {
    const checks = REFERENCE_MAP[entityType] ?? []
    const found: ReferenceInfo[] = []

    for (const check of checks) {
      try {
        const ref = collection(db, check.collection)
        const q = query(
          ref,
          where('userId', '==', authStore.user?.id ?? ''),
          where(check.field, '==', entityId)
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          found.push({
            module: check.module,
            routePath: check.routePath,
            count: snap.size,
            filterParam: check.filterParam,
            filterValue: entityId,
          })
        }
      } catch {
        // Non-blocking — if we can't check, proceed without blocking delete
      }
    }

    if (found.length > 0) {
      references.value = found
      pendingDeleteFn.value = deleteFn
      showDialog.value = true
    } else {
      await deleteFn()
    }
  }

  async function confirmDelete() {
    if (pendingDeleteFn.value) {
      await pendingDeleteFn.value()
      pendingDeleteFn.value = null
    }
    showDialog.value = false
    references.value = []
  }

  function cancelDelete() {
    showDialog.value = false
    references.value = []
    pendingDeleteFn.value = null
  }

  return { checkAndDelete, confirmDelete, cancelDelete, showDialog, references }
}
```

- [ ] **Step 2: Create DeleteWithReferencesDialog component**

Create `components/common/DeleteWithReferencesDialog.vue`:

```vue
<template lang="pug">
v-dialog(:model-value="modelValue" max-width="500" @update:model-value="$emit('update:modelValue', $event)")
  v-card
    v-card-title {{ $t('common.deleteTitle') }}
    v-card-text
      p {{ $t('common.deleteReferencesWarning') }}
      v-list(density="compact")
        v-list-item(
          v-for="ref in references"
          :key="ref.module"
          :prepend-icon="'mdi-link'"
        )
          v-list-item-title
            | {{ ref.count }} {{ ref.module }}
            v-btn(
              icon
              variant="text"
              size="x-small"
              :to="`${ref.routePath}?${ref.filterParam}=${ref.filterValue}`"
              @click="$emit('update:modelValue', false)"
            )
              v-icon(size="small") mdi-filter
    v-card-actions
      v-spacer
      v-btn(color="default" variant="text" @click="$emit('cancel')") {{ $t('common.cancel') }}
      v-btn(color="error" variant="tonal" @click="$emit('confirm')") {{ $t('common.deleteAnyway') }}
</template>

<script setup lang="ts">
import type { ReferenceInfo } from '~/composables/useDeleteWithReferences'

defineProps<{
  modelValue: boolean
  references: ReferenceInfo[]
}>()

defineEmits(['update:modelValue', 'confirm', 'cancel'])
</script>
```

- [ ] **Step 3: Add i18n keys**

In `locales/en.ts`, add to the `common` section:
```typescript
deleteTitle: 'Delete record',
deleteReferencesWarning: 'This record is referenced by other items. Deleting it may affect them:',
deleteAnyway: 'Delete anyway',
```

In `locales/nl.ts`:
```typescript
deleteTitle: 'Record verwijderen',
deleteReferencesWarning: 'Dit record wordt door andere items gebruikt. Verwijderen kan invloed hebben op:',
deleteAnyway: 'Toch verwijderen',
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add composables/useDeleteWithReferences.ts components/common/DeleteWithReferencesDialog.vue locales/ && git commit -m "feat: add useDeleteWithReferences composable and dialog

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 6: Wire delete-with-references into module pages

For each page that has a delete action, replace the direct `store.delete(id)` call with `checkAndDelete(entityType, id, () => store.delete(id))` and add the dialog component.

**Pages to update:**
- `pages/behaviors/index.vue` (deleteBehavior)
- `pages/people/index.vue`
- `pages/projects/index.vue`
- `pages/tasks/index.vue`
- `pages/meetings/index.vue`
- `pages/teams/index.vue` (if delete action exists)
- `pages/coaching/index.vue`

For each page:

- [ ] **Step 1: Read the page to find the delete handler**

```bash
grep -n "delete\|Delete" pages/behaviors/index.vue | head -15
```

- [ ] **Step 2: Add composable and dialog**

At the top of the script section add:
```typescript
const { checkAndDelete, confirmDelete, cancelDelete, showDialog: deleteDialog, references: deleteRefs } = useDeleteWithReferences()
```

Replace the delete call (example for behaviors):
```typescript
// Before:
await behaviorStore.deleteBehavior(selectedBehavior.value.id)

// After:
await checkAndDelete('behaviors', selectedBehavior.value.id, () =>
  behaviorStore.deleteBehavior(selectedBehavior.value.id)
)
```

At the bottom of the template, add:
```pug
DeleteWithReferencesDialog(
  v-model="deleteDialog"
  :references="deleteRefs"
  @confirm="confirmDelete"
  @cancel="cancelDelete"
)
```

- [ ] **Step 3: Repeat for all 7 pages listed above**

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add pages/ && git commit -m "feat: wire delete-with-references dialog into all module pages

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run all tests**

```bash
cd organizer-app && npm run test 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 2: Verify i18n keys added in both locales**

```bash
grep -n "dataModel\|exportCsv\|deleteTitle\|deleteAnyway\|deleteReferences" locales/en.ts locales/nl.ts
```

Expected: keys present in both files.

- [ ] **Step 3: Verify AdminCard is used in all 13 overview pages**

```bash
grep -rn "AdminCard" pages/ --include="*.vue" | wc -l
```

Expected: 13 or more.

---

## Done

Track 3 complete when:
- All form components call `setNavigationDirty(true)` on field change
- `AdminCard` appears on all 13 overview pages
- Delete confirmation dialog shows references before allowing deletion
- All tests pass
