# Feature Requests

Canonical list of requested or planned features. Derived from codebase and rules.

For **per-module product specs** (purpose, routes, data, integrations), see [`modules.md`](./modules.md). **Teams** detail: [`teams.md`](./teams.md).

**Persistence:** Firebase/Firestore only for primary app data—see [`data-storage.md`](./data-storage.md).

---

## Implemented

- Behavior tracking (do well, want to do better, need to improve)
- People/contacts management with tags and relations
- **Teams** attention board: team list with weighted attention, member columns, **inbox mail** + **assigned tasks** per column, optional project on cards; add task per member; Firestore `teams` + `teamMailMeta`
- Project management with pages, tasks, team members; **project attachments**: external links (`projectLinks`), files (`projectFiles` + Storage), mail message links (`projectMailLinks`) with bidirectional UX (project detail + Mail reading pane); meeting form **related projects**
- Task management with subtasks, comments, priority, recurrence
- Calendar view for meetings and tasks
- Meeting management with summaries, attendees, categories
- Mail compose
- Network visualization (relationships between entities)
- Statistics (time on projects, behaviors, tasks)
- Multi-language (en, nl)
- Firebase auth + OIDC
- OAuth integrations (Google, placeholder for Microsoft)
- AI integrations (XAI, OpenAI, Gemini)
- Feedback collection (screenshot, console, optional Claude processing)
- Coaching records and knowledge base
- Dark/light theme
- Demo mode for auth bypass

---

## From Rules (Not Yet Implemented)

- Breadcrumbs (Welcome root; path retention on drill-down; reset on menu)
- Unsaved changes guard before navigation
- Admin card on overview pages (data model icon, export icon)
- Server-side v-data-table with pagination, sorting, filtering, bulk actions
- Module templates for consistent record display
- Quick-add overlay parity with full add form
- Delete with references flow (inform user, filter icon to affected records)
- Storybook for component library
- OpenAPI for server API
- MCP exposure for API
- YAML i18n in `i18n/` folder (currently using `locales/*.ts`)
- Web workers for request buffering when offline

---

## Explicitly out of scope (by product choice)

- **SQL-backed primary storage** and the SQL fixture / truncate-load workflow from `database-fixtures.mdc`—see [`data-storage.md`](./data-storage.md).

---

## Suggested Future Features

- Teams: true **drag-and-drop** column reorder; non-email **plugins** on the same board; Mail deep link when the target message is **not** in the current folder/page (search or fetch-by-id)
- Microsoft OAuth implementation (currently placeholder)
- Recurring meeting support
- Shared projects/team workspaces
- Mobile app or PWA enhancements
- Deeper AI integration (e.g., auto-summarize meetings)
