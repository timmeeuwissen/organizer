# Roadmap

High-level delivery priorities. Update as scope and priorities evolve.

---

## Phase 1: Foundation (Current)

- [x] Firebase auth and Firestore
- [x] Core modules: Behaviors, People, **Teams** (attention board), Projects, Tasks, Meetings, Calendar, Mail, Coaching
- [x] OAuth integrations (Google; Microsoft placeholder)
- [x] AI integrations (XAI, OpenAI, Gemini)
- [x] Feedback system
- [x] Multi-language (en, nl)
- [x] Nuxt 4 target (see README)

---

## Phase 2: Alignment with Rules

- [ ] Breadcrumbs (Welcome root; path retention/reset)
- [ ] Unsaved changes guard before navigation
- [ ] Admin card on overview pages (data model, export)
- [ ] Server-side v-data-table where applicable
- [ ] Module templates for consistent record display
- [ ] Quick-add form parity with full add
- [ ] Delete with references flow
- [ ] Storybook for component library
- [ ] YAML i18n in `i18n/` (optional migration from locales)

---

## Phase 3: API and Infrastructure

- [ ] OpenAPI for server API
- [ ] MCP exposure
- [ ] Database fixtures and `make db-truncate` / `make db-load-fixture` (if moving to SQL or for demo)
- [ ] Web workers for offline request buffering
- [ ] GitHub Actions for build/CI

---

## Phase 4: Extensions

- [ ] Teams: drag-and-drop columns; more attention sources than email
- [ ] Microsoft OAuth implementation
- [ ] Recurring meeting support
- [ ] Shared/team projects
- [ ] PWA enhancements
- [ ] Deeper AI integration (e.g., meeting summarization)
