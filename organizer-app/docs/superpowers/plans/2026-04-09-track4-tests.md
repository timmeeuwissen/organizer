# Track 4: Test Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **DEPENDENCY:** Run this track AFTER Tracks 1 (lint) and 2 (reliability) are merged. Store error handling in Track 2 adds `useNotificationStore` calls that tests should exercise.

**Goal:** All stores without unit tests get them. Key composables from Track 3 get unit tests. All tests pass with `make test`.

**Architecture:** Each store test uses the same pattern: mock `firebase/firestore`, mock `stores/auth`, create a Pinia instance, call store actions, assert on state and mock call counts.

**Tech Stack:** Vitest, @vue/test-utils, createPinia, vi.mock

**Working directory for all commands:** `organizer-app/`

**Already-covered stores (skip):** `behaviors`, `knowledge`, `network`, `notification`, `projects`, `tasks`

---

## Vitest mock pattern (copy for every new store test)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'test-user-id' } }))
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, id: '', data: () => ({}) })),
  doc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(() => ({})),
  setDoc: vi.fn(() => Promise.resolve()),
}))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({
    error: vi.fn(),
    success: vi.fn(),
  }))
}))

import { setActivePinia, createPinia } from 'pinia'
```

---

## Task 1: Test the coaching store

**Files:**
- Create: `tests/unit/stores/coaching.test.ts`

The coaching store has `records`, `loading`, `error` state. Key actions: `fetchCoachingRecords`, `addCoachingRecord`, `updateCoachingRecord`, `deleteCoachingRecord`.

- [ ] **Step 1: Read the coaching store to understand action names**

```bash
grep -n "async " stores/coaching.ts | head -20
```

- [ ] **Step 2: Write the test file**

Create `tests/unit/stores/coaching.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'test-user-id' } }))
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, id: '', data: () => ({}) })),
  doc: vi.fn(() => ({ id: 'coaching1' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'coaching-new' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(() => ({})),
  setDoc: vi.fn(() => Promise.resolve()),
}))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({ error: vi.fn(), success: vi.fn() }))
}))

vi.mock('~/stores/people', () => ({
  usePeopleStore: vi.fn(() => ({ people: [] }))
}))

import { setActivePinia, createPinia } from 'pinia'
import { useCoachingStore } from '../../../stores/coaching'
import { getDocs, addDoc, deleteDoc } from 'firebase/firestore'
import { useNotificationStore } from '~/stores/notification'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('CoachingStore – load', () => {
  it('starts with empty records', () => {
    const store = useCoachingStore()
    expect(store.records).toHaveLength(0)
  })

  it('sets loading false after successful fetch', async () => {
    const store = useCoachingStore()
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any)
    // Call the appropriate load/fetch action from the store
    // Read stores/coaching.ts to find the exact action name
    const actionName = Object.keys(store).find(k => k.startsWith('fetch') || k.startsWith('load'))
    if (actionName && typeof (store as any)[actionName] === 'function') {
      await (store as any)[actionName]()
    }
    expect(store.loading).toBe(false)
  })

  it('calls notify.error when fetch fails', async () => {
    const store = useCoachingStore()
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Firestore error'))
    const notifyStore = useNotificationStore()
    const actionName = Object.keys(store).find(k => k.startsWith('fetch') || k.startsWith('load'))
    if (actionName && typeof (store as any)[actionName] === 'function') {
      await (store as any)[actionName]()
    }
    expect(notifyStore.error).toHaveBeenCalled()
  })
})

describe('CoachingStore – create', () => {
  it('calls addDoc when creating a record', async () => {
    const store = useCoachingStore()
    const createAction = Object.keys(store).find(k => k.startsWith('add') || k.startsWith('create'))
    if (createAction && typeof (store as any)[createAction] === 'function') {
      await (store as any)[createAction]({
        personId: 'person1',
        date: new Date(),
        notes: 'Test notes',
        type: 'session',
      })
    }
    expect(addDoc).toHaveBeenCalled()
  })
})

describe('CoachingStore – delete', () => {
  it('calls deleteDoc when deleting a record', async () => {
    const store = useCoachingStore()
    const deleteAction = Object.keys(store).find(k => k.startsWith('delete') || k.startsWith('remove'))
    if (deleteAction && typeof (store as any)[deleteAction] === 'function') {
      await (store as any)[deleteAction]('coaching1')
    }
    expect(deleteDoc).toHaveBeenCalled()
  })
})
```

**Note:** Read `stores/coaching.ts` for exact action names and adjust the test accordingly. The pattern above uses dynamic lookup as a safety net — replace with direct calls once you know the names.

- [ ] **Step 3: Run the test**

```bash
cd organizer-app && npm run test -- tests/unit/stores/coaching.test.ts 2>&1 | tail -20
```

Expected: all tests pass. Fix any failures by reading the store source.

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add tests/unit/stores/coaching.test.ts && git commit -m "test(coaching): add unit tests for coaching store

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 2: Test the people store

**Files:**
- Create: `tests/unit/stores/people.test.ts`

- [ ] **Step 1: Read people store actions**

```bash
grep -n "async " stores/people.ts 2>/dev/null | head -20; ls stores/people/ 2>/dev/null
```

- [ ] **Step 2: Write tests**

Create `tests/unit/stores/people.test.ts` following the same pattern as coaching.test.ts above, adjusted for:
- People collection name: `'people'`
- Key actions: `fetchPeople` (or `loadPeople`), `addPerson` (or `createPerson`), `updatePerson`, `deletePerson`
- State: `people: []`, `loading: false`, `error: null`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'test-user-id' } }))
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, id: '', data: () => ({}) })),
  doc: vi.fn(() => ({ id: 'person1' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'person-new' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(() => ({})),
}))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({ error: vi.fn(), success: vi.fn() }))
}))

import { setActivePinia, createPinia } from 'pinia'
import { usePeopleStore } from '../../../stores/people'
import { getDocs, addDoc, deleteDoc } from 'firebase/firestore'
import { useNotificationStore } from '~/stores/notification'

beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

describe('PeopleStore', () => {
  it('starts empty', () => {
    const store = usePeopleStore()
    expect(store.people).toHaveLength(0)
  })

  it('calls notify.error when load fails', async () => {
    const store = usePeopleStore()
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('fail'))
    const notify = useNotificationStore()
    // Replace with actual action name from stores/people.ts
    const loadFn = (store as any).fetchPeople ?? (store as any).loadPeople
    if (loadFn) await loadFn.call(store).catch(() => {})
    expect(notify.error).toHaveBeenCalled()
  })
})
```

Expand with create/update/delete tests after reading the actual action names.

- [ ] **Step 3: Run tests and fix failures**

```bash
cd organizer-app && npm run test -- tests/unit/stores/people.test.ts 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add tests/unit/stores/people.test.ts && git commit -m "test(people): add unit tests for people store

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 3: Test the teams store

**Files:**
- Create: `tests/unit/stores/teams.test.ts`

- [ ] **Step 1: Read teams store**

```bash
grep -n "async \|state:\|records:\|teams:" stores/teams.ts | head -20
```

- [ ] **Step 2: Write tests**

Follow the same pattern as tasks 1 and 2, using the actual action and state names from `stores/teams.ts`.

Focus on:
- `state.teams` starts empty
- load action sets `loading = false` after completion
- load calls `notify.error` on failure
- create action calls `addDoc`
- delete action calls `deleteDoc`

- [ ] **Step 3: Run and fix**

```bash
cd organizer-app && npm run test -- tests/unit/stores/teams.test.ts 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add tests/unit/stores/teams.test.ts && git commit -m "test(teams): add unit tests for teams store

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 4: Test the meetings store

**Files:**
- Create: `tests/unit/stores/meetings.test.ts`

- [ ] **Step 1: Read meetings store**

```bash
grep -n "async \|state:\|meetings:" stores/meetings.ts | head -20; ls stores/meetings/ 2>/dev/null
```

- [ ] **Step 2: Write tests**

If there are sub-stores in `stores/meetings/`, test only `stores/meetings.ts` — mock the sub-modules.

Follow the standard pattern: empty state, load error calls notify, create calls addDoc, delete calls deleteDoc.

- [ ] **Step 3: Run and fix**

```bash
cd organizer-app && npm run test -- tests/unit/stores/meetings.test.ts 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add tests/unit/stores/meetings.test.ts && git commit -m "test(meetings): add unit tests for meetings store

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 5: Test the calendar store

**Files:**
- Create: `tests/unit/stores/calendar.test.ts`

- [ ] **Step 1: Read calendar store**

```bash
grep -n "async \|state:\|events:" stores/calendar.ts | head -20; ls stores/calendar/ 2>/dev/null
```

- [ ] **Step 2: Write tests**

Focus on state structure, error notification, and CRUD calls. If the calendar store syncs from external providers (Google Calendar, etc.), mock those sub-modules.

- [ ] **Step 3: Run and fix**

```bash
cd organizer-app && npm run test -- tests/unit/stores/calendar.test.ts 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add tests/unit/stores/calendar.test.ts && git commit -m "test(calendar): add unit tests for calendar store

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 6: Test the feedback store

**Files:**
- Create: `tests/unit/stores/feedback.test.ts`

- [ ] **Step 1: Read feedback store**

```bash
grep -n "async \|state:\|feedback:" stores/feedback.ts | head -20
```

- [ ] **Step 2: Write tests following standard pattern**

- [ ] **Step 3: Run and fix**

```bash
cd organizer-app && npm run test -- tests/unit/stores/feedback.test.ts 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add tests/unit/stores/feedback.test.ts && git commit -m "test(feedback): add unit tests for feedback store

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 7: Test the mail store

**Files:**
- Create: `tests/unit/stores/mail.test.ts`

The mail store likely uses integration providers (Gmail, Exchange). Mock them:

- [ ] **Step 1: Read mail store imports and actions**

```bash
grep -n "async \|import\|state:" stores/mail.ts | head -30
```

- [ ] **Step 2: Write tests**

Mock any provider utilities imported from `utils/api/mailProviders/`. Focus on store state management, not provider implementation.

```typescript
// Example mock for provider
vi.mock('~/utils/api/mailProviders/gmailProvider', () => ({
  GmailProvider: vi.fn(() => ({ fetchMail: vi.fn(() => Promise.resolve([])) }))
}))
```

- [ ] **Step 3: Run and fix**

```bash
cd organizer-app && npm run test -- tests/unit/stores/mail.test.ts 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add tests/unit/stores/mail.test.ts && git commit -m "test(mail): add unit tests for mail store

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 8: Test useUnsavedChanges composable

**Files:**
- Create: `tests/unit/composables/useUnsavedChanges.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useUnsavedChanges, navigationDirty } from '../../../composables/useUnsavedChanges'

beforeEach(() => {
  // Reset shared state between tests
  navigationDirty.value = false
})

describe('useUnsavedChanges', () => {
  it('navigationDirty starts false', () => {
    expect(navigationDirty.value).toBe(false)
  })

  it('setNavigationDirty(true) marks dirty', () => {
    const { setNavigationDirty } = useUnsavedChanges()
    setNavigationDirty(true)
    expect(navigationDirty.value).toBe(true)
  })

  it('setNavigationDirty(false) clears dirty', () => {
    const { setNavigationDirty } = useUnsavedChanges()
    setNavigationDirty(true)
    setNavigationDirty(false)
    expect(navigationDirty.value).toBe(false)
  })

  it('returns navigationDirty ref', () => {
    const { navigationDirty: dirty } = useUnsavedChanges()
    expect(dirty).toBe(navigationDirty)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd organizer-app && npm run test -- tests/unit/composables/useUnsavedChanges.test.ts 2>&1 | tail -10
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add tests/unit/composables/useUnsavedChanges.test.ts && git commit -m "test(composables): add tests for useUnsavedChanges

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 9: Test useDeleteWithReferences composable

**Files:**
- Create: `tests/unit/composables/useDeleteWithReferences.test.ts`

(Only run after Track 3 has created the composable.)

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, size: 0 })),
  getFirestore: vi.fn(() => ({})),
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'test-user-id' } }))
}))

import { useDeleteWithReferences } from '../../../composables/useDeleteWithReferences'
import { getDocs } from 'firebase/firestore'

beforeEach(() => { vi.clearAllMocks() })

describe('useDeleteWithReferences', () => {
  it('calls deleteFn directly when no references found', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: true, size: 0 } as any)
    const { checkAndDelete, showDialog } = useDeleteWithReferences()
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    await checkAndDelete('people', 'person1', deleteFn)
    expect(deleteFn).toHaveBeenCalled()
    expect(showDialog.value).toBe(false)
  })

  it('shows dialog when references exist', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: false, size: 2, docs: [{}, {}] } as any)
    const { checkAndDelete, showDialog, references } = useDeleteWithReferences()
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    await checkAndDelete('people', 'person1', deleteFn)
    expect(deleteFn).not.toHaveBeenCalled()
    expect(showDialog.value).toBe(true)
    expect(references.value.length).toBeGreaterThan(0)
  })

  it('confirmDelete calls deleteFn and closes dialog', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: false, size: 1, docs: [{}] } as any)
    const { checkAndDelete, confirmDelete, showDialog } = useDeleteWithReferences()
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    await checkAndDelete('people', 'person1', deleteFn)
    await confirmDelete()
    expect(deleteFn).toHaveBeenCalled()
    expect(showDialog.value).toBe(false)
  })

  it('cancelDelete closes dialog without calling deleteFn', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: false, size: 1, docs: [{}] } as any)
    const { checkAndDelete, cancelDelete, showDialog } = useDeleteWithReferences()
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    await checkAndDelete('people', 'person1', deleteFn)
    cancelDelete()
    expect(deleteFn).not.toHaveBeenCalled()
    expect(showDialog.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd organizer-app && npm run test -- tests/unit/composables/useDeleteWithReferences.test.ts 2>&1 | tail -15
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add tests/unit/composables/useDeleteWithReferences.test.ts && git commit -m "test(composables): add tests for useDeleteWithReferences

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 10: Full test suite verification

- [ ] **Step 1: Run all tests**

```bash
cd organizer-app && npm run test 2>&1 | tail -30
```

Expected: all tests pass, zero failures.

- [ ] **Step 2: Count total test files**

```bash
find tests/unit -name "*.test.*" | wc -l
```

Expected: 15 or more (was 35 — but new files add on top of existing count; verify it grew).

- [ ] **Step 3: Fix any remaining failures**

If any test fails:
1. Read the error carefully
2. Check whether the store action name matches what's in the test
3. Check whether mocks need additional methods
4. Fix and re-run

- [ ] **Step 4: Final commit**

```bash
cd organizer-app && git add tests/ && git commit -m "test: comprehensive store and composable test coverage

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Done

Track 4 complete when:
- Tests exist for: coaching, people, teams, meetings, calendar, feedback, mail stores
- Tests exist for: useUnsavedChanges, useDeleteWithReferences composables
- `npm run test` passes with zero failures
