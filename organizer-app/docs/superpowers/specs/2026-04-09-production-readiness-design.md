# Production Readiness — Design Spec

**Date:** 2026-04-09  
**Status:** Approved  
**Approach:** Parallel agent tracks (Approach B)

---

## Objective

Bring the organizer app to a confidently production-ready state without adding new features. The app is a personal productivity tool (Nuxt 4, Vue 3, Vuetify 3, Pinia, Firebase). All 13 domain modules are implemented; the gap is tooling, reliability, UX compliance, and test coverage.

---

## Out of Scope

- OpenAPI / MCP exposure (Phase 3)
- Web workers for offline buffering (Phase 3)
- YAML i18n migration from `locales/*.ts` (Phase 3)
- Storybook (Phase 3)
- Microsoft OAuth implementation (Phase 4)
- Any new features or modules

---

## Track 1 — Tooling & CI

**Goal:** Every push to `main` runs lint, unit tests, and build automatically. Developers get fast feedback on lint errors locally.

### ESLint Config

- Create `eslint.config.js` using flat config (ESLint 9+)
- Extend `@nuxt/eslint-config` for Vue/Nuxt/TS rules
- Enable rules: `no-unused-vars`, `@typescript-eslint/no-explicit-any`, `vue/multi-word-component-names` (warn), `vue/no-unused-vars`
- Auto-fix all auto-fixable violations; resolve remaining manually
- Update `package.json` lint scripts to use flat config if needed

### GitHub Actions CI

- File: `.github/workflows/ci.yml`
- Trigger: push and pull_request to `main`
- Jobs (sequential, fail-fast):
  1. `lint` — `npm run lint`
  2. `test` — `npm run test`
  3. `build` — `npm run build`
- Node version: match `package.json` engines field (or 20.x if not specified)
- Cache: `node_modules` via `actions/cache` on `package-lock.json` hash

---

## Track 2 — Reliability

**Goal:** No silent failures. Every async operation gives user feedback. Every list/table shows meaningful state in all conditions.

### Store Error Handling

Every store action that calls Firebase or an external API must:
- Wrap in `try/catch`
- On catch: call `notify.error(t('module.errors.loadFailed'))` (or appropriate i18n key)
- Never swallow errors silently
- Applies to: `load()`, `create()`, `update()`, `delete()`, `import()`, `export()`

Stores to audit: `behaviors.ts`, `people/`, `teams.ts`, `projects/`, `tasks/`, `calendar/`, `meetings/`, `mail.ts`, `coaching.ts`, `network.ts`, `knowledge.ts`, `feedback.ts`

### Loading & Saving State

Each store must expose:
- `isLoading: boolean` — set true at start of `load()`, false on completion (success or error)
- `isSaving: boolean` — set true at start of `create/update/delete`, false on completion

Components must:
- Show `v-skeleton-loader` or `v-progress-linear` while `isLoading` is true
- Disable Save/Delete buttons while `isSaving` is true

### Empty States

Every `v-data-table` and list component must implement the `no-data` slot with:
- Descriptive message (i18n key)
- Optional call-to-action (quick-add button where applicable)

### TypeScript Quality

- Resolve `any` types in stores and composables — replace with typed interfaces from `types/`
- Remove `@ts-ignore` comments where possible; document unavoidable ones
- Do not change runtime behaviour — type fixes only

---

## Track 3 — Phase 2 UX Compliance

**Goal:** All 13 modules follow the GUI conventions defined in CLAUDE.md consistently.

### Breadcrumbs

- Create `components/AppBreadcrumbs.vue` (reusable, placed in the layout)
- Root crumb: always "Welcome" (links to `/dashboard`)
- On drill-down (detail page): append record label to crumb path
- On menu navigation: reset to root
- Use `useRoute()` + a breadcrumb composable (`composables/useBreadcrumbs.ts`) to build crumbs
- Each module's overview page: one crumb (module name). Detail page: two crumbs (module → record title).

### Unsaved Changes Guard

- Create `composables/useUnsavedChanges.ts`
- API: `const { markDirty, markClean, guardNavigation } = useUnsavedChanges()`
- Calls `onBeforeRouteLeave` — if dirty, shows a Vuetify confirm dialog: "You have unsaved changes. Leave anyway?"
- Mark dirty on any form field change; mark clean on save or cancel
- Apply to all detail/edit forms across all 13 modules

### Admin Card

Every module overview page gets an admin card (fixed position, bottom-right corner or as a toolbar row):
- **Data model icon** (`mdi-code-json`): opens a dialog showing the TypeScript interface for that module's record type as formatted JSON schema
- **Export icon** (`mdi-export`): downloads current (filtered) table data as CSV
- Use a shared `components/AdminCard.vue` component that accepts `modelInterface` and `exportData` props
- Wire up in all 13 module overview pages

### Delete With References

Before executing any delete:
1. Query all other collections that may reference the record by ID
2. If references found: show a dialog listing them by module with count
3. Each listed module shows a filter icon — clicking it navigates to that module's overview pre-filtered to records referencing the deleted item
4. User must confirm deletion explicitly; UI makes clear what will be affected
5. Create `composables/useDeleteWithReferences.ts` — accepts record type and ID, returns `{ checkReferences, confirmDelete }`

Reference map (which modules reference which):
- People → referenced by Tasks (assignee), Meetings (attendees), Projects (members), Coaching
- Projects → referenced by Tasks, Meetings, Teams
- Tasks → referenced by Projects (task list), Meetings
- Teams → referenced by Projects, People (membership)
- Meetings → referenced by Projects, Coaching
- Behaviors → referenced by Coaching records

---

## Track 4 — Test Coverage

**Goal:** All stores, all server API routes, and key composables have unit tests. Tests run cleanly after Tracks 1 & 2 stabilise.

### Store Tests

One test file per store in `tests/unit/stores/`. Pattern:
```
describe('[Module]Store', () => {
  it('load() populates state on success')
  it('load() calls notify.error on failure')
  it('create() adds item and notifies success')
  it('create() calls notify.error on failure')
  it('update() updates item and notifies success')
  it('delete() removes item and notifies success')
  it('isLoading is true during load, false after')
})
```

Stores to cover: `behaviors`, `people`, `teams`, `projects`, `tasks`, `calendar`, `meetings`, `mail`, `coaching`, `network`, `knowledge`, `feedback`, `notification`

### Server API Route Tests

One test file per route in `tests/unit/server/`. Pattern:
- Happy path: valid input → expected response
- Validation: malformed body → 400 with error detail
- Auth guard: unauthenticated request → 401

Routes: `ai/analyze`, `ai/test-integration`, `auth/oidc-callback`, `auth/refresh`, `icons/[icon]`, `proxy`, `system/audit`

### Composable Tests

- `useUnsavedChanges` — dirty/clean state, guard triggers, guard dismisses
- `useDeleteWithReferences` — reference detection, dialog state
- `useBreadcrumbs` — crumb generation on route change, reset on menu nav
- `useModuleIntegrationAccounts` — filter list by whitelisted modules

---

## Sequencing

```
Week 1:
  Track 1 (Tooling)       ████████ done
  Track 2 (Reliability)   ████████ done
  Track 3 (Phase 2 UX)    ████████ done

Week 2:
  Track 4 (Tests)         ████████ done  (after Tracks 1+2)
```

Tracks 1, 2, and 3 run in parallel as separate agent sessions.  
Track 4 runs after Tracks 1 and 2 are merged.

---

## Success Criteria

- `make lint` passes with zero errors
- `make test` passes with zero failures
- `make build` succeeds
- GitHub Actions CI passes on every push
- Every store action is wrapped in error handling with user notification
- Every list/table has loading skeleton and empty state
- Breadcrumbs present on all pages
- Unsaved-changes guard active on all edit forms
- Admin card (data model + export) on all 13 overview pages
- Delete-with-references flow on all modules
- Test files exist for all stores, server routes, and key composables
