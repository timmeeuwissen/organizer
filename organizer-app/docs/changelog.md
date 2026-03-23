# Changelog

Running list of documentation and project changes. Versions are defined using Git tags.

---

## Unreleased

### Added

- **Teams module**: `pages/teams/`, `stores/teams.ts`, `composables/useTeamAttentionBoard.ts`, `types/models/team.ts`; Firestore `teams` + `teamMailMeta` (rules + indexes); nav + quick-add; `docs/product/teams.md`
- **Teams + tasks**: Board shows tasks assigned to column members; weighted attention includes tasks; `/tasks?id=` deep link; TaskForm `assigneePersonIdsFilter` + `initialAssignedToId`; per-column add task
- `docs/product/modules.md` — Product specification per application module (routes, purpose, capabilities, data, integrations)
- `docs/rules-overview.md` — Summary of all project rules from `.cursor/rules/`
- `docs/architecture.md` — Architecture documentation derived from codebase
- `docs/product/vision.md` — Product vision and non-negotiable goals
- `docs/product/feature-requests.md` — Canonical feature list (implemented and planned)
- `docs/product/user-flows.md` — User flows derived from pages and navigation
- `docs/product/roadmap.md` — Delivery priorities and phases

### Changed

- **Teams / Firestore**: `firestore.rules` — explicit `get`/`list`/`create`/`update`/`delete` for `teams` and `teamMailMeta`; `stores/teams.ts` — Firebase Auth session check vs Pinia user, clearer `permission-denied` messaging; `docs/firestore-deployment.md` + Teams deploy note in `docs/product/teams.md`
- README: Nuxt 3 → Nuxt 4 in Technology Stack and description
- README: Node.js prerequisite 16+ → 20+ (required for Nuxt 4)
- `package.json`: Nuxt 3 → Nuxt 4.4.x; Pinia 2 → 3; @pinia/nuxt 0.4 → 0.11; pinia-plugin-persistedstate 4.2 → 4.7
- `package.json`: Added `engines.node: ">=20"`
