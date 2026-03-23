# Project Rules Overview

This document summarizes the rules defined in `.cursor/rules/`. All rules are marked `alwaysApply: true`. Treat this as a reference; the canonical source is the `.mdc` files themselves.

---

## 1. config-i18n-client-server.mdc

*Configuration, i18n, client–server, Node.js*

| Area | Rules |
|------|-------|
| **No hardcoding** | No business or config values in code; use a `config` directory |
| **i18n** | Use YAML files in an `i18n` folder for translations |
| **Client–server** | Design for unreliable connectivity; web workers to buffer non-GET requests; Pinia for state; debounce outbound requests |
| **GET requests** | Honor HTTP cache headers |
| **Wire format** | Default to JSON |
| **URLs** | Never hardcode URLs; use env vars or runtime configuration |
| **Nuxt/service layer** | Use Nuxt native API where appropriate; for heavier logic use `services/<service-name>/` with `make` targets |
| **Node.js** | Prefer upgrading to a later compatible version over downgrading |

---

## 2. frontend-nuxt.mdc

*Nuxt 4, Vue, frontend*

| Area | Rules |
|------|-------|
| **Stack** | Nuxt 4, Vue, Vuetify; follow Nuxt 4 directory structure; use path aliases |
| **Subdirectories** | Merge generated files (e.g. `.gitignore`) instead of overwriting |
| **Templates** | Use Pug for HTML |
| **Styles** | Use SASS (indented syntax) |
| **Scripts** | TypeScript; types in a `types` folder |
| **Components** | Focused responsibilities; extend/reuse existing components instead of duplicating |
| **Storybook** | Provide a `make` target to open Storybook; annotate components for Storybook |
| **User flows** | Describe in human-readable language; behavioral tests where possible; `make` target for tests |

---

## 3. gui-module-conventions.mdc

*Domain modules (DDD bounded contexts)*

| Area | Rules |
|------|-------|
| **Icons** | Each module has a consistent icon used everywhere |
| **Menu** | Collapsible drawer menu in top bar; all modules listed |
| **Top bar** | Show module name next to app name |
| **Breadcrumbs** | Root = Welcome; path retention when drilling down; reset on menu/welcome |
| **Unsaved changes** | Check before navigation; prompt: abandon or stay |
| **Quick-add** | `+` icon in top-right; overlay with same form as normal add; Cancel/Save |
| **i18n** | Translation file per module in `i18n` |
| **Relations** | Searchable dropdowns; display records per module template |
| **Forms** | Inline validation; Save disabled until valid |
| **References** | Use cards (icon, title, description) |
| **Delete with refs** | Inform user; show referencing module and filter icon; filter navigates to overview |
| **Module templates** | Template defines how records appear in dropdowns/refs |
| **Detail headers** | Format header per module template |
| **Admin card** | Data model icon (JSON/SQL DDL/visual); export icon (CSV/INSERT) |
| **Overview mode** | Server-side v-data-table; pagination; sortable; filterable; bulk checkbox; edit/delete icons |
| **Bulk actions** | Export and delete selected; header checkbox toggles selection |
| **Referenced values** | Render per module template; icon links to detail page |

---

## 4. product-context.mdc

*Product docs and workflow*

| Area | Rules |
|------|-------|
| **Product docs** | Canonical source in `docs/product/` (`vision.md`, `feature-requests.md`, `user-flows.md`, `roadmap.md`) |
| **AI usage** | Treat product docs as source of truth; align with vision/roadmap; call out conflicts |
| **Scope changes** | Update product docs rather than duplicating in rules |
| **Workflow** | Refine product docs → derive implementation → implement and update docs |
| **Clarification** | Ask for or propose doc updates when ambiguous |

---

## 5. cli-and-makefile.mdc

*CLI, OS, Makefile, scripts*

| Area | Rules |
|------|-------|
| **OS** | Support macOS, Linux, and container environments |
| **CLI** | Tab-completion where possible; color output (blue/yellow-orange/red) |
| **Makefile** | Default `help` from comments; all CLI commands as `make` targets |
| **Start/stop** | Every start target has a corresponding stop target |
| **`make <target> --help`** | Show Markdown file or script `--help`; fallback: gray “No help available” |
| **Scripts** | Non-trivial logic in `scripts/*.sh` |
| **Dependencies** | Script to list OS deps; if >4, use `deps/` with numbered files |
| **Database** | `make` targets for import/export to/from `data/` |
| **Output** | Clear messages with icons; dark green for info |

---

## 6. docs-versioning-linting.mdc

*Documentation, versioning, linting*

| Area | Rules |
|------|-------|
| **Documentation** | Changes in Markdown under `docs`; running changelog; versions via Git tags |
| **Versioning** | Build routines via GitHub Actions |
| **Security** | `.gitignore` robust; pre-commit hook for sensitive data |
| **Linting** | Scripts for all languages; `make` targets for lint and auto-fix |
| **Pre-commit** | Commits only when lint passes |
| **Base rules** | Derive lint rules from base rules in `AI/` folder |

---

## 7. containerization-and-env.mdc

*Docker, Kubernetes, environment*

| Area | Rules |
|------|-------|
| **Containerization** | Docker and Kubernetes; `make` targets for build, start, stop, test |
| **Mocks** | Mock external endpoints when running in containers |
| **Kubernetes** | Use Helm charts/scripts |
| **Env vars** | Central config; example env file with descriptions |
| **Dev without env** | `make` target to build env file interactively |
| **Non-dev** | List missing vars and stop if required vars missing |
| **Security** | No hardcoded env values; exclude env files from VCS and build output |

---

## 8. apis-and-contracts.mdc

*API design and contracts*

| Area | Rules |
|------|-------|
| **Server-side** | Business logic, storage, and retrieval in APIs |
| **OpenAPI** | Each API has OpenAPI spec; `make` target to open docs |
| **MCP** | Expose APIs as MCP where applicable; definitions in `MCP/` |
| **Contracts** | Machine-readable contract per endpoint; validate requests; reject malformed |
| **Caching** | HTTP cache headers on GET; tune by data type and volatility |

---

## 9. ai-workflow.mdc

*AI and development workflow*

| Area | Rules |
|------|-------|
| **Make vs yarn** | Prefer `make` over `yarn` for commands |
| **Debugging** | Check both server and client logs |
| **Dev server** | Run in background; read output when diagnosing |
| **Versions** | Consider tool/framework versions when diagnosing |
| **Verification** | Verify via server logs, Nitro, browser console |
| **Unit tests** | For repositories, utilities, calculations, validation, algorithms |
| **Behavior tests** | For flows in `user-flows.md`, API behavior, E2E workflows, errors |
| **Test placement** | In `tests/` mirroring `server/` and `components/`; use Vitest |

---

## 10. database-fixtures.mdc

*Fixtures and database setup*

| Area | Rules |
|------|-------|
| **Fixture** | Always have loadable fixture via `make`; store under `data/fixtures/` |
| **Order** | Respect foreign keys and self-references |
| **Model changes** | Update `server/utils/database.ts` and `data/fixtures/schema.sql` when schema changes |
| **Coverage** | Fixture covers typical cases, edge cases, statuses, cycles |
| **Truncate** | `make db-truncate`; require typing `yes`; no truncate without confirmation |
| **Load** | `make db-load-fixture` runs truncate first; abort if truncate cancelled |
| **Scripts** | Truncate/load logic in `scripts/db-truncate.sh`, `scripts/db-load-fixture.sh` |

---

## 11. gui-messaging.mdc

*User feedback and audit*

| Area | Rules |
|------|-------|
| **Centralized messaging** | Single Pinia store; components push to it, no direct snackbars |
| **Message types** | `success`, `error`, `info`, `warning` |
| **UI** | `v-snackbar` at bottom; color by type; one at a time |
| **When to push** | Every data-mutating action; success/error on completion |
| **Audit log** | Write each message to parseable log (JSON lines or structured text) |
| **Log fields** | Timestamp (ISO 8601), type, text, optional userId |
| **Log path** | Configurable (e.g. `logs/audit.log`) |

---

## Rule File Index

| File | Focus |
|------|-------|
| `config-i18n-client-server.mdc` | Config, i18n, client–server, Nuxt, Node.js |
| `frontend-nuxt.mdc` | Nuxt 4, Vue, Vuetify, Pug, SASS, Storybook |
| `gui-module-conventions.mdc` | Module UI: menu, breadcrumbs, forms, tables, admin card |
| `product-context.mdc` | Product docs and product-driven workflow |
| `cli-and-makefile.mdc` | Make, scripts, OS compatibility |
| `docs-versioning-linting.mdc` | Docs, versioning, linting, security |
| `containerization-and-env.mdc` | Docker, Kubernetes, env vars |
| `apis-and-contracts.mdc` | API design, OpenAPI, MCP, contracts, caching |
| `ai-workflow.mdc` | Make, testing, verification |
| `database-fixtures.mdc` | Fixtures, truncate, load |
| `gui-messaging.mdc` | Messaging store, snackbar, audit log |
