# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

The primary application lives under `organizer-app/`. Run all commands from that directory unless noted otherwise.

```
organizer-app/
├── app/                  # Nuxt 4 app dir (pages, components, composables, layouts, middleware, plugins)
├── config/               # Business constants and configuration (never hardcode values in code)
├── locales/              # Translation files: en.ts, nl.ts  (rule says i18n/ YAML — gap, see below)
├── server/               # Nitro server routes: api/{ai,auth,icons,proxy,system}, middleware/, utils/
├── stores/               # Pinia stores, one per domain module
├── types/                # TypeScript interfaces and model definitions
├── utils/api/            # Provider abstractions (AI, calendar, mail, contacts, tasks)
├── tests/                # Unit (Vitest) and e2e (Cypress), mirrors source structure
├── docs/                 # architecture.md, changelog.md, product/, testing/, make/
├── MCP/                  # Model Context Protocol API definitions
├── openapi/              # OpenAPI spec: openapi/openapi.yaml
├── scripts/              # Non-trivial shell logic (called by Makefile)
└── Makefile              # All CLI commands as make targets; run `make help`
```

## Commands

**Always prefer `make` over `npm`/`yarn` directly.**

```bash
# First-time setup
make init              # install + setup-env (interactive .env creation)
make setup-env         # Re-run env setup only

# Development
make dev               # Start Nuxt dev server on port 3000

# Testing
make test              # Vitest unit tests (once)
make test:unit:watch   # Vitest watch mode
make test-e2e          # Cypress interactive UI
make test-e2e-run      # Cypress headless (CI)

# Run a single test file
npm run test -- tests/unit/stores/notification.test.ts
# Filter by test name
npm run test -- --grep "some pattern"

# Linting
make lint              # ESLint on .ts/.js/.vue
make lint:fix          # ESLint with auto-fix

# Build & preview
make build
make preview

# Deploy
make firebase-deploy
make docker-build && make docker-run
make k8s-deploy

# Firebase utilities
make firebase-emulate        # Run emulators locally
make firebase-rules          # Deploy Firestore security rules

# See all targets
make help
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Nuxt 4 (SSR disabled), Vue 3, Vuetify 3 |
| Templates | Pug |
| Styles | SASS (indented syntax, not SCSS) |
| Scripts | TypeScript (strict); types in `types/` |
| State | Pinia (with persistence plugin) |
| Backend | Firebase — Firestore + Auth (no SQL) |
| Auth | Firebase Auth + OIDC (oidc-client-ts) |
| i18n | vue-i18n, English + Dutch |
| Validation | Zod (server-side, on POST bodies) |
| Testing | Vitest (unit), Cypress (e2e) |
| Infrastructure | Docker, Kubernetes, Home Assistant add-on |

## Architecture

### Domain Modules (DDD Bounded Contexts)

Each feature area follows a consistent structure:

| Module | Route | Icon |
|--------|-------|------|
| Dashboard | `/dashboard` | — |
| Behaviors | `/behaviors` | mdi-account-cog |
| People | `/people` | mdi-account-group |
| Teams | `/teams` | mdi-account-multiple-outline |
| Projects | `/projects` | mdi-folder-multiple |
| Tasks | `/tasks` | mdi-checkbox-marked-outline |
| Calendar | `/calendar` | mdi-calendar |
| Meetings | `/meetings` | mdi-account-group-outline |
| Mail | `/mail` | mdi-email |
| Coaching | `/coaching` | mdi-account-heart |
| Statistics | `/statistics` | mdi-chart-bar |
| Network | `/network` | mdi-graph |
| Feedback | `/feedback` | mdi-message-text-outline |

Each module has: `pages/<module>/`, `components/<module>/`, `stores/<module>.ts`, translations, and TypeScript model in `types/models/`.

### Pinia Store Pattern

```typescript
export const use[Module]Store = defineStore('[module]', {
  persist: true,
  state: () => ({...}),
  actions: {
    async load() {...},
    async create(item) {...},
    async update(id, item) {...},
    async delete(id) {...},
  }
})
```

All client–server communication is routed through Pinia stores. Debounce outbound requests where appropriate. Design for unreliable connectivity: use web workers to buffer non-GET requests when offline and replay them on reconnect.

### API Provider Abstractions (Strategy Pattern)

`utils/api/` contains pluggable providers under shared interfaces:

- `aiProviders/` — BaseAIProvider, Gemini, OpenAI, XAI
- `calendarProviders/` — Google, Exchange, Office 365
- `mailProviders/` — Gmail, Exchange, Office 365
- `contactProviders/`, `taskProviders/`
- `core/` — BaseProvider, oauthUtils, apiUtils

### Server API (Nitro)

Routes in `server/api/`:
- `ai/analyze.ts` — POST, Zod-validated AI text analysis
- `ai/test-integration.ts` — POST, test AI API key
- `auth/oidc-callback.ts`, `auth/refresh.ts` — OAuth flows
- `icons/[icon].ts` — GET with `Cache-Control` headers
- `proxy.ts` — GET, allowlisted external proxy
- `system/audit.ts` — POST, append JSONL to `logs/audit.log`

GET endpoints must respond with appropriate `Cache-Control` headers. POST bodies are validated with Zod; reject malformed requests. Each API should have an OpenAPI spec entry in `openapi/openapi.yaml`; run `make api-docs` to view. Expose APIs as MCP where applicable — definitions go in `MCP/`.

### Authentication

1. Firebase Auth is primary (email/password, Google)
2. OIDC via `oidc-client-ts` for Microsoft and other providers
3. Demo mode: `localStorage.demoMode = true` or `VITE_AUTH_BYPASS=true` in `.env`

### Messaging & Audit

All user-facing feedback flows through `stores/notification.ts` — never render snackbars directly in components. Every data-mutating action (create/update/delete/import/export) must push a message on completion.

```typescript
const notify = useNotificationStore()
notify.success('...')   // green
notify.error('...')     // red
notify.info('...')      // blue
notify.warning('...')   // amber
```

Every pushed message is written to `logs/audit.log` as a JSON line:
```json
{"ts":"2025-02-18T14:32:01.234Z","type":"SUCCESS","text":"...","userId":"user-123"}
```

## Coding Conventions

These are enforced by `.cursor/rules/` (all `alwaysApply: true` unless noted):

### Configuration and i18n

- Business and configuration values belong in `config/`, never hardcoded in code.
- All user-visible strings must go through the i18n system. No raw strings in templates.
- Never hardcode URLs — read from env vars or `nuxt.config.ts` `runtimeConfig`.

### Frontend

- **Templates**: Pug only.
- **Styles**: SASS indented syntax only (not SCSS).
- **Scripts**: TypeScript; store types in `types/`.
- Extend or reuse existing components before creating new ones.
- Path aliases must be used for imports into aliased directories.

### GUI Module Conventions (apply to every domain module)

- **Icon**: Each module uses one consistent icon everywhere it appears.
- **Top bar**: Shows module name next to the app name.
- **Breadcrumbs**: Root is always "Welcome". Retain path when drilling through records; reset on menu or welcome navigation.
- **Quick-add**: `+` icon in top-right opens an overlay with the same form as the normal add flow. Options: Cancel / Save.
- **Unsaved changes guard**: Check for unsaved form state before any navigation; prompt the user to abandon or stay.
- **Overview mode**: Use a server-side `v-data-table` with pagination, sortable columns, filtering. Left column: checkbox + edit icon. Right column: delete icon. Middle columns scroll horizontally.
- **Bulk actions**: Select multiple rows → export or delete selected.
- **Admin card** (on every overview page): data-model icon (opens JSON/DDL/visual dialog) and export icon (CSV or SQL INSERT).
- **Delete with references**: Inform the user which records reference the item; show referencing module with a filter icon that navigates to a filtered overview.
- **Module template**: Each module defines how its records appear in dropdowns and references; detail page headers must use the same template format.
- **Form validation**: Inline validation; Save disabled while form is invalid.
- **References**: Shown as cards with module icon, title, and description.

### Context Actions

- Right-click on interactive surfaces (rows, cards, canvas) must open an in-app context menu — not the browser's default. Prevent `contextmenu` default on those surfaces.
- The menu anchors near the cursor and dismisses on click-outside or Escape.
- Every context menu action must also be reachable without the context menu (toolbar, row actions, detail buttons, etc.).
- Touch equivalent: swipe actions or overflow/more affordance — never rely on right-click alone on mobile.
- Every action includes an icon consistent with its icon elsewhere in the app.
- Action sets are config-driven, not hardcoded per component. Labels are i18n keys.

### Integration Account Filtering

Only modules that consume provider data show integration account filter UI. The whitelist is in `config/moduleIntegration.ts` (`mail`, `calendar`, `tasks`, `people`, `meetings`). Use `components/integrations/ModuleIntegrationAccountFilter.vue` backed by `composables/useModuleIntegrationAccounts.ts`. Do not add this UI to organizer-only modules without first updating `config/moduleIntegration.ts` and the product docs.

### APIs and Contracts

- Business logic, storage, and data retrieval belong on the server side in API routes.
- Each API must have an OpenAPI entry and a `make` target to open its docs.
- Expose APIs as MCP where applicable; store definitions in `MCP/`.
- Validate all incoming requests (use Zod); reject malformed requests.
- GET endpoints must set appropriate `Cache-Control` headers.

### Makefile and Scripts

- Every `start` target must have a corresponding `stop` target.
- Non-trivial shell logic lives in `scripts/*.sh`, not inline in the Makefile.
- `make <target> --help` displays the matching Markdown in `docs/make/` or calls the script with `--help`.
- CLI output: blue for info, yellow/orange for warnings, red for errors.

### Testing

- Unit tests: stores, utilities, calculations, validators, algorithms.
- Behavior/integration tests: user flows from `docs/product/user-flows.md`, API behavior, error scenarios.
- Tests live in `tests/` mirroring the source structure (`tests/unit/stores/`, `tests/unit/utils/`, etc.).
- Use Vitest for all unit and behavioral tests.
- Write tests alongside new implementation, not after.

### Environment and Docker

- Maintain `.env.example` with descriptions for every variable.
- Env files must not be committed (`make setup-env` creates them interactively).
- In non-development mode, the app must list missing required vars and stop.

## Product Workflow

`docs/product/` is the single source of truth for product intent:

- `vision.md` — application vision and non-negotiable goals
- `modules.md` — module specifications
- `roadmap.md` — delivery priorities
- `feature-requests.md` — canonical list of requested features
- `user-flows.md` — behavioural expectations and UX flows
- `data-storage.md` — data persistence strategy
- `teams.md`, `integrations.md` — feature-specific specs

**Workflow**: refine product docs first → derive implementation → implement and update docs. When requirements are ambiguous or new scope appears, update the product docs before writing code.

## Known Rule Gaps (architecture.md)

These are areas where the code does not yet fully comply with the rules above — do not flag them as new issues, but implement toward compliance when touching that area:

- `locales/*.ts` is used; rules call for `i18n/*.yaml`
- No Storybook target yet
- Breadcrumbs not yet fully implemented
- Admin card (data model / export icons) not yet on all overview pages
- Not all overview pages use server-side `v-data-table`
- OpenAPI and MCP exposure is partial
