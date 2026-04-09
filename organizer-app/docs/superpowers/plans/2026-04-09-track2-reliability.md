# Track 2: Reliability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every async store action shows user-facing error notifications on failure. No silent errors.

**Architecture:** Each store's `catch` blocks must call `useNotificationStore().error(t('errors.generic'))`. Stores already have `this.loading` / `this.error` state — we ADD notification calls inside existing catch blocks. We do NOT restructure stores. Pages that lack loading/empty states get them added.

**Tech Stack:** Pinia stores, `useNotificationStore`, `vue-i18n`, Vuetify skeleton loaders

**Working directory for all commands:** `organizer-app/`

**Key fact:** `errors.generic` = `'An error occurred. Please try again.'` is already in `locales/en.ts`. Use this key for all store errors unless a more specific key exists for that domain.

---

## Task 1: Add notify.error() to behaviors store

**Files:**
- Modify: `stores/behaviors.ts`

- [ ] **Step 1: Add import at top of file (after existing imports)**

Open `stores/behaviors.ts`. After the last import line, add:

```typescript
import { useNotificationStore } from '~/stores/notification'
```

- [ ] **Step 2: Add notify call to every catch block**

The store has catch blocks at lines ~58, ~95, ~138, ~203, ~246 (verify exact lines by reading the file). In each catch block, add this line immediately before or after `this.error = ...`:

```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

Example — `fetchBehaviors` catch block should look like:
```typescript
} catch (error: any) {
  this.error = error.message || 'Failed to fetch behaviors'
  useNotificationStore().error('An error occurred. Please try again.')
  console.error('Error fetching behaviors:', error)
}
```

Apply this pattern to ALL catch blocks in the file.

- [ ] **Step 3: Run tests**

```bash
cd organizer-app && npm run test -- tests/unit/stores/notification.test.ts 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add stores/behaviors.ts && git commit -m "fix(behaviors): add user-facing error notifications to all store actions

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 2: Add notify.error() to coaching store

**Files:**
- Modify: `stores/coaching.ts`

- [ ] **Step 1: Read the file to understand catch block locations**

```bash
grep -n "catch\|this\.error" stores/coaching.ts
```

- [ ] **Step 2: Add import**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

- [ ] **Step 3: Add notify call inside every catch block**

```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 4: Commit**

```bash
cd organizer-app && git add stores/coaching.ts && git commit -m "fix(coaching): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 3: Add notify.error() to feedback store

**Files:**
- Modify: `stores/feedback.ts`

- [ ] **Step 1: Read catch block locations**

```bash
grep -n "catch\|this\.error" stores/feedback.ts
```

- [ ] **Step 2: Add import and notify calls**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/feedback.ts && git commit -m "fix(feedback): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 4: Add notify.error() to mail store

**Files:**
- Modify: `stores/mail.ts`

- [ ] **Step 1: Read catch block locations**

```bash
grep -n "catch\|this\.error" stores/mail.ts
```

- [ ] **Step 2: Add import and notify calls**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/mail.ts && git commit -m "fix(mail): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 5: Add notify.error() to meetings store

**Files:**
- Modify: `stores/meetings.ts` and any files in `stores/meetings/`

- [ ] **Step 1: Find all meetings store files**

```bash
ls stores/meetings/ 2>/dev/null; grep -n "catch\|this\.error" stores/meetings.ts 2>/dev/null | head -20
```

- [ ] **Step 2: Add import and notify calls to meetings.ts and all files in stores/meetings/**

In each file, add:
```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/meetings.ts stores/meetings/ && git commit -m "fix(meetings): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 6: Add notify.error() to people store

**Files:**
- Modify: `stores/people.ts` and any files in `stores/people/`

- [ ] **Step 1: Find all people store files**

```bash
ls stores/people/ 2>/dev/null; grep -n "catch\|this\.error" stores/people.ts 2>/dev/null | head -20
```

- [ ] **Step 2: Add import and notify calls**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/people.ts stores/people/ && git commit -m "fix(people): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 7: Add notify.error() to projects store

**Files:**
- Modify: `stores/projects.ts` and any files in `stores/projects/`

- [ ] **Step 1: Find all projects store files**

```bash
ls stores/projects/ 2>/dev/null; grep -n "catch\|this\.error" stores/projects.ts | head -30
```

- [ ] **Step 2: Add import and notify calls**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/projects.ts stores/projects/ && git commit -m "fix(projects): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 8: Add notify.error() to tasks store

**Files:**
- Modify: `stores/tasks.ts` and any files in `stores/tasks/`

- [ ] **Step 1: Find all tasks store files**

```bash
ls stores/tasks/ 2>/dev/null; grep -n "catch\|this\.error" stores/tasks.ts | head -30
```

- [ ] **Step 2: Add import and notify calls**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/tasks.ts stores/tasks/ && git commit -m "fix(tasks): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 9: Add notify.error() to teams store

**Files:**
- Modify: `stores/teams.ts`

- [ ] **Step 1: Read catch block locations**

```bash
grep -n "catch\|this\.error" stores/teams.ts | head -20
```

- [ ] **Step 2: Add import and notify calls**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/teams.ts && git commit -m "fix(teams): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 10: Add notify.error() to calendar and calendar sub-stores

**Files:**
- Modify: `stores/calendar.ts` and any files in `stores/calendar/`

- [ ] **Step 1: Find all calendar store files**

```bash
ls stores/calendar/ 2>/dev/null; grep -n "catch\|this\.error" stores/calendar.ts 2>/dev/null | head -20
```

- [ ] **Step 2: Add import and notify calls to each file**

```typescript
import { useNotificationStore } from '~/stores/notification'
```

In each catch block:
```typescript
useNotificationStore().error('An error occurred. Please try again.')
```

- [ ] **Step 3: Commit**

```bash
cd organizer-app && git add stores/calendar.ts stores/calendar/ && git commit -m "fix(calendar): add user-facing error notifications

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 11: Audit pages for missing loading/empty states

The following pages already have loading states and empty states (confirmed):
`behaviors/index.vue`, `tasks/index.vue`, `projects/index.vue`, `people/index.vue`, `teams/index.vue`, `coaching/index.vue`, `feedback/index.vue`

- [ ] **Step 1: Check calendar, mail, meetings, network pages**

```bash
grep -n "v-skeleton-loader\|loading\|no-data\|empty" pages/calendar/index.vue | head -10
grep -n "v-skeleton-loader\|loading\|no-data\|empty" pages/mail/index.vue | head -10
grep -n "v-skeleton-loader\|loading\|no-data\|empty" pages/meetings/index.vue | head -10
grep -n "v-skeleton-loader\|loading\|no-data\|empty" pages/network/index.vue 2>/dev/null | head -10
```

- [ ] **Step 2: For any page missing loading indicators, read the page and add them**

For a page that uses a store with a `loading` property, add `v-if="store.loading"` skeleton and `v-else-if="store.items.length === 0"` empty state. Example pattern:

```pug
v-skeleton-loader(v-if="store.loading" type="table")
template(v-else)
  v-alert(v-if="store.items.length === 0" type="info" variant="tonal") No items yet.
  // ... actual content
```

- [ ] **Step 3: Commit any changes**

```bash
cd organizer-app && git add pages/ && git commit -m "fix(ui): add loading and empty states to pages missing them

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run all tests**

```bash
cd organizer-app && npm run test 2>&1 | tail -20
```

Expected: all tests pass, no failures.

- [ ] **Step 2: Verify notification import exists in all modified stores**

```bash
grep -rn "useNotificationStore" stores/ --include="*.ts" | grep -v ".test." | grep -v "notification.ts"
```

Expected: at least one result per store file modified (behaviors, coaching, feedback, mail, meetings, people, projects, tasks, teams, calendar).

---

## Done

Track 2 complete when:
- Every store's catch blocks call `useNotificationStore().error(...)`
- All main overview pages have loading skeletons and empty states
- All tests pass
