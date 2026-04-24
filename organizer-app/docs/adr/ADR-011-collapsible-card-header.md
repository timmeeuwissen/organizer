# ADR-011: CollapsibleCard component

**Date:** 2026-04-24
**Status:** Accepted

## Context

The application had no shared collapsible card primitive. Individual pages had each re-implemented the chevron-toggle pattern in isolation — for example, `components/tasks/TasksOverviewTable.vue` contained the canonical reference implementation. This led to inconsistent keyboard/ARIA behaviour, no persistence of open/closed state, and duplicated logic.

A deleted `components/common/CollapsableFilterPanel.vue` (note: misspelled) had attempted a similar abstraction but was removed. The existing `components/common/FilterCard.vue` provided a plain non-collapsible card with a title + clear-filter action; it became the first migration target.

## Decision

### `composables/useCollapsible.ts`

A thin, Pinia-free composable that:
- Accepts `storageKey` (optional) and `defaultOpen` (default `true`).
- Reads initial state from `localStorage` when `storageKey` is provided, falling back to `defaultOpen`.
- Writes back to `localStorage` via a `watch` whenever the state changes.
- Returns `{ isOpen, toggle }`.

No Pinia coupling. Each call site gets its own isolated reactive state.

### `components/common/CollapsibleCard.vue`

A `v-card`-based component that:
- Uses two independent `useCollapsible` instances: one for the card body (respects `storageKey` + `defaultOpen` props), one for the help panel (always `defaultOpen: false`).
- Exposes a `header-actions` slot so consumers can inject action icons into the always-visible title row without coupling to the collapse implementation.
- Wraps both the help panel and card body in `v-expand-transition` + `v-show` for smooth animation.
- Sets `aria-expanded` and i18n-sourced `aria-label` on both toggle buttons for accessibility.
- Renders the help panel only when `helpText` prop is provided, with `amber-lighten-5` background between the title row and the body.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | required | Card title |
| `storageKey` | String | undefined | When set, persists open/closed to localStorage |
| `defaultOpen` | Boolean | true | Initial state when no persisted value exists |
| `helpText` | String | undefined | When set, renders a toggleable help panel |

**Slots:**

| Slot | Always visible | Description |
|------|---------------|-------------|
| `default` | No | Card body content |
| `header-actions` | Yes | Additional icons in the title row |

**Header action ordering convention:**

Actions in the `header-actions` slot must follow this left-to-right order (left of the help icon):

1. **Add** (`mdi-plus`) — opens a dialog or overlay to add a new item. Must appear here, never inside the card body. Use a `v-btn` icon with `size="small"` and `variant="text"`.
2. Other domain-specific actions (e.g. filter-clear, export)
3. *(help icon is always rightmost — rendered by `CollapsibleCard` itself when `helpText` is provided)*

If a card has an add action, the `+` icon in the header replaces any add button or link that would otherwise appear inside the card body. This keeps the header the single interaction bar and the body purely informational/content.

### i18n keys added

Under `common` in both `locales/en.ts` and `locales/nl.ts`:
- `collapse` / `expand` — aria-labels for the body toggle
- `showHelp` / `hideHelp` — aria-labels for the help toggle

### FilterCard migration

`components/common/FilterCard.vue` now delegates entirely to `CollapsibleCard`, mapping its `title` prop and conditional clear-filter button (via `header-actions` slot). Its external API (`title`, `hasFilters` prop, `clear-filters` emit) is unchanged — all existing call sites continue to work without modification.

## Consequences

- **Incremental migration:** Other components with ad-hoc chevron patterns can be migrated to `CollapsibleCard` independently without a big-bang rewrite.
- **Accessible by default:** `aria-expanded` and labelled toggle buttons are baked into the primitive, not left to individual implementations.
- **No Pinia coupling:** `useCollapsible` is a plain Vue composable. State is local to each component instance; `localStorage` persistence is opt-in via `storageKey`.
- **FilterCard call sites unaffected:** The public props/emit contract of `FilterCard` is preserved; the migration is transparent to consumers.
- **LocalStorage key namespacing** is caller responsibility — use namespaced keys like `tasks.filterCard` to avoid cross-page collisions.
- **Out of scope:** `FilterContainer.vue`, `TaskForm.vue`, `MailComposeForm.vue`, and `IntegrationAccountForm.vue` use `v-expansion-panels` for a structurally different purpose and are not touched.
