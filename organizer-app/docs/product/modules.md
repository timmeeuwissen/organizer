# Product: Application Modules

This document describes each **module** (route area) of Organizer as a product specification: purpose, audience, capabilities, data, and integrations. It is derived from the current implementation and should stay aligned with `user-flows.md` and `feature-requests.md`.

---

## 1. Welcome / entry (`/`)

| Field | Description |
|-------|-------------|
| **Routes** | `/` |
| **Purpose** | Single entry point that routes users to the right next screen without exposing a standalone “welcome” page. |
| **Audience** | All visitors. |
| **Capabilities** | On load: resolve authentication (Firebase). If authenticated → redirect to `/dashboard`. If not → redirect to `/auth/login`. Shows a loading state while checking. |
| **Primary data** | None (orchestration only). |
| **Integrations** | Firebase Auth. |
| **Product notes** | There is no persistent “Welcome” landing page in the sense of the GUI conventions roadmap; breadcrumb “Welcome” is not yet implemented. |

---

## 2. Authentication & account

### 2.1 Login (`/auth/login`)

| Field | Description |
|-------|-------------|
| **Purpose** | Sign in with email and password. |
| **Capabilities** | Form validation; remember-me option; links to register and forgot password; error display. |
| **Data** | Credentials → Firebase Auth session. |

### 2.2 Register (`/auth/register`)

| Field | Description |
|-------|-------------|
| **Purpose** | Create a new account. |
| **Capabilities** | Registration flow against Firebase. |

### 2.3 Forgot password (`/auth/forgot-password`)

| Field | Description |
|-------|-------------|
| **Purpose** | Request password reset. |
| **Capabilities** | Email-based recovery flow. |

### 2.4 OIDC callback (`/auth/callback`)

| Field | Description |
|-------|-------------|
| **Purpose** | Complete OpenID Connect sign-in after redirect from provider. |
| **Capabilities** | Handles callback from `oidc-client-ts` integration. |

### 2.5 User profile & settings (`/auth/profile`)

| Field | Description |
|-------|-------------|
| **Purpose** | Central place for identity, preferences, and **integration accounts** (Google / Exchange / Office 365 style). |
| **Capabilities** | Display name, avatar placeholder, dark mode, language-related settings, integration toggles (calendar, mail, tasks, contacts), AI integration configuration, OAuth connection management. |
| **Data** | `User`, `UserSettings`, `IntegrationAccount`, optional `AIIntegrationData`. |
| **Integrations** | Google OAuth (and placeholders for Microsoft); AI providers (XAI, OpenAI, Gemini). |

---

## 3. Dashboard (`/dashboard`)

| Field | Description |
|-------|-------------|
| **Purpose** | At-a-glance home after login: what matters today across domains. |
| **Audience** | Authenticated users. |
| **Capabilities** | Cards/widgets for: upcoming tasks, today’s meetings (placeholder messaging when empty), recently contacted people, project snapshot, behaviors summary, coaching highlights (where implemented). Navigation “view more” into deeper modules. |
| **Primary data** | Tasks, meetings, people, projects, behaviors, coaching (read aggregations). |
| **Product notes** | Some meeting/calendar widgets may show empty states until data or integrations are active. |

---

## 4. Behaviors (`/behaviors`)

| Field | Description |
|-------|-------------|
| **Purpose** | Track **personal behaviors** in three lenses: what you do well, what you want to do better, and what you need to improve. |
| **Audience** | Users doing self-reflection, habit, or performance coaching. |
| **Capabilities** | Three-column board (Do well / Want to do better / Need to improve). List behaviors with title and rationale; open detail/edit; add per column. Action plans can tie to tasks (model supports `actionPlans` with task IDs). |
| **Primary data** | `Behavior` (type, title, description, rationale, examples, actionPlans). |
| **Integrations** | Stored in Organizer (Firestore); quick-add from global `+` menu. |

---

## 5. People (`/people`)

| Field | Description |
|-------|-------------|
| **Purpose** | **Contact directory** with org context, tags, and links to projects, meetings, and tasks. |
| **Audience** | Anyone managing relationships and follow-ups. |
| **Capabilities** | Filter sidebar (search, account/provider filters, checkbox filters). “Recently contacted” sidebar. Main table of all people; sync contacts from connected providers; add/edit person; optional storage provider (Organizer vs external). |
| **Primary data** | `Person` (name, email, phone, org, role, team, notes, tags, relations, `lastContacted`, provider fields). |
| **Integrations** | Google / Exchange / Office 365 contact sync (via integration accounts). |

---

## Teams (`/teams`)

Full product spec and decisions: [`teams.md`](./teams.md).

| Field | Description |
|-------|-------------|
| **Purpose** | **Team-centric attention**: list teams with a **weighted attention** indicator; per-team **board** with one **column per member** (from **People**); **Kanban-style cards** for inbox items to respond to (email v1). |
| **Routes** | `/teams` (list + create), `/teams/[id]` (board). |
| **Capabilities** | Create/delete teams; add/remove members from contacts; column order: **alphabetical**, **manual**, or **arrow reorder** (“drag” mode placeholder); **emails** (auto-match sender or manual assign + optional project on meta) and **tasks** assigned to that person (todo / inProgress / delegated); task cards show title, project, due date; add task per column (assignee limited to team). |
| **Primary data** | `Team`, `TeamMailMeta` in Firestore (`types/models/team.ts`). |
| **Integrations** | Mail (inbox fetch); same OAuth mail accounts as Mail module. |

---

## 6. Projects

### 6.1 Project overview (`/projects`)

| Field | Description |
|-------|-------------|
| **Purpose** | Portfolio view of **projects** with status, priority, and progress. |
| **Capabilities** | Status filters (all, planning, active, on hold, completed, cancelled). Search. Project cards with progress, team, due dates; navigate to detail. |
| **Primary data** | `Project`. |

### 6.2 Project detail (`/projects/[id]`)

| Field | Description |
|-------|-------------|
| **Purpose** | Single project workspace: narrative, structure, and linked work. |
| **Capabilities** | Project metadata; tabs for tasks, notes (`ProjectPage`), meetings; **links** (external URLs in Firestore `projectLinks`); **files** (metadata in `projectFiles`, binaries in Firebase Storage under `users/{uid}/projects/{projectId}/…`); **connected mail** (`projectMailLinks`: `accountId` + provider message id + optional subject/from snapshots). Open a linked message in Mail via `/mail?accountId=&emailId=`. |
| **Primary data** | `Project`, `ProjectPage`, related `Task` / `Meeting` IDs; `projectLinks`, `projectFiles`, `projectMailLinks` (see `types/models/projectAttachments.ts`). |

---

## 7. Tasks (`/tasks`)

| Field | Description |
|-------|-------------|
| **Purpose** | **Task inbox** and planning: personal and work items with priority, status, projects, and subtasks. |
| **Audience** | Users coordinating work and follow-ups. |
| **Capabilities** | Rich filters (search, provider accounts, status/priority/type chips and selects). Sidebar: upcoming tasks, overdue tasks. Main list/table with complete/edit; toggle completion; provider color indicators for externally synced tasks. |
| **Primary data** | `Task` (status, priority, type, due dates, assignee, project, parent/subtasks, comments, recurrence, tags, provider fields). |
| **Integrations** | Organizer + Google Tasks / Exchange / Office 365 (per account settings). |

---

## 8. Calendar (`/calendar`)

| Field | Description |
|-------|-------------|
| **Purpose** | Unified **calendar view** across connected calendars and Organizer-relevant events. |
| **Audience** | Users with at least one calendar integration configured. |
| **Capabilities** | If no calendar integrations: CTA to profile to connect. With integrations: date picker, provider selection, filter switches, view switcher (month / week / day / schedule), event rendering from merged sources. |
| **Primary data** | Calendar events from providers + local/calendar store; links to meetings where applicable (`calendarEventId` on `Meeting`). |
| **Integrations** | Google Calendar, Exchange, Office 365 (via `utils/api/calendarProviders`). |

---

## 9. Meetings

### 9.1 Meeting overview (`/meetings`)

| Field | Description |
|-------|-------------|
| **Purpose** | List and manage **meetings**: past and upcoming, with categories and participants. |
| **Capabilities** | Filters (search, selects). Link to category management. Virtual data table of upcoming meetings; create new meeting; open detail by row. |
| **Primary data** | `Meeting` (title, times, location, participants, summary, tasks, projects, category, planned status). |

### 9.2 Meeting detail (`/meetings/[id]`)

| Field | Description |
|-------|-------------|
| **Purpose** | Read meeting record, summary, and links. |
| **Capabilities** | View content; navigation to edit where applicable. |

### 9.3 Meeting edit (`/meetings/[id]/edit`)

| Field | Description |
|-------|-------------|
| **Purpose** | Update meeting fields and relationships. |
| **Capabilities** | Form-driven edit aligned with `MeetingForm` patterns (including **related projects** multi-select, same as create flows). |

### 9.4 Meeting categories (`/meetings/categories`)

| Field | Description |
|-------|-------------|
| **Purpose** | Administer **meeting categories** (name, description, color, icon) for classification across the meetings module. |
| **Capabilities** | CRUD table; create category dialog. |
| **Primary data** | `MeetingCategory`. |

---

## 10. Mail (`/mail`)

| Field | Description |
|-------|-------------|
| **Purpose** | **Email hub**: browse folders and messages from connected mail accounts. |
| **Audience** | Users with mail integration (e.g. Gmail). |
| **Capabilities** | Empty state → profile to connect. With accounts: folder list with unread counts, provider account chips, message list, reading pane, compose entry points; Google re-authorization handling (`GoogleReauthManager`). **Link message to project** (reading pane): creates `projectMailLinks`; chips show linked projects with unlink. **Deep link** from a project’s connected mail: `/mail?accountId={id}&emailId={id}` opens the message when it is in the current loaded list (otherwise an info notice). |
| **Primary data** | Messages via provider APIs; compose flows tied to `mail` store and providers; persisted **project–message** links in Firestore `projectMailLinks`. |
| **Integrations** | Gmail, Exchange, Office 365 (`utils/api/mailProviders`). |

---

## 11. Coaching

### 11.1 Coaching overview (`/coaching`)

| Field | Description |
|-------|-------------|
| **Purpose** | **Coaching journal**: records of coaching conversations or self-coaching notes. |
| **Capabilities** | Search; list/grid of coaching records; create new (dialog); loading and error states. Some UI strings are not yet fully i18n’d (hardcoded “Coaching” / “New Coaching” in template). |
| **Primary data** | Coaching records (`stores/coaching`, types in `types/models/coaching.ts`). |

### 11.2 Coaching detail (`/coaching/[id]`)

| Field | Description |
|-------|-------------|
| **Purpose** | Deep view of a single coaching record. |
| **Capabilities** | Detail layout and related knowledge base hooks as implemented. |

### 11.3 Knowledge base (within coaching domain)

| Field | Description |
|-------|-------------|
| **Purpose** | **Knowledge documents** associated with coaching (markdown-oriented content). |
| **Capabilities** | Forms and lists via `KnowledgeBase`, `KnowledgeDocumentForm`; quick-add from global menu. |
| **Primary data** | `KnowledgeDocument` (per `types/models/knowledgeDocument.ts`). |

---

## 12. Statistics (`/statistics`)

| Field | Description |
|-------|-------------|
| **Purpose** | **Analytics** over time: where time goes and how tasks and meetings trend. |
| **Audience** | Users who want quantitative feedback on productivity and focus. |
| **Capabilities** | Period and chart-type filters. Charts (e.g. time distribution, task completion, meetings, behaviors) using canvas-based visualization when data exists; empty states when not. |
| **Primary data** | Aggregated or computed stats; model `Statistics` in types for structured stats storage. |

---

## 13. Network (`/network`)

| Field | Description |
|-------|-------------|
| **Purpose** | **Relationship graph** between people, projects, tasks, and meetings. |
| **Audience** | Users exploring how entities connect. |
| **Capabilities** | Filter by entity types and subsets (e.g. people, projects, task statuses). Interactive graph (`vis-network`): nodes and edges; drill-down / navigation to entities where wired. |
| **Primary data** | Derived graph from `Person`, `Project`, `Task`, `Meeting` and their cross-references. |

---

## 14. Feedback (admin) (`/feedback`)

| Field | Description |
|-------|-------------|
| **Purpose** | **Internal / operator view** of user-submitted feedback (not the floating submit button—that is global). |
| **Audience** | Admins or developers reviewing submissions. |
| **Capabilities** | Tabs: new (unseen), all, approved, improved, archived. Tables with timestamps and actions; view detail; workflow hooks for “improved” and archive; optional Claude processing via Makefile scripts (outside this page). |
| **Primary data** | `Feedback` (message, screenshot, console log, page URL, flags). |
| **Integrations** | Firestore; demo mode supported for testing. |

---

## Cross-cutting: global quick-add and navigation

| Concern | Description |
|---------|-------------|
| **Quick-add** | Top-bar `+` opens module-specific overlays (task, person, calendar event, mail, behavior, project, meeting, coaching, knowledge document) or navigates to **Teams** create (`/teams?new=1`) with forms aligned to each module. |
| **Navigation drawer** | Lists all primary modules above plus Statistics, Network, Feedback; nested Meetings → Categories; **Teams** between People and Projects. |
| **Notifications** | `NotificationSnackbar` + Pinia `notification` store for success/error/info/warning toasts. |
| **i18n** | Most modules use `locales/en.ts` and `locales/nl.ts`; Coaching overview still mixes hardcoded English in places. |

---t

## Module index (quick reference)

| Module | Base route |
|--------|------------|
| Entry / redirect | `/` |
| Auth | `/auth/*` |
| Dashboard | `/dashboard` |
| Behaviors | `/behaviors` |
| People | `/people` |
| Teams | `/teams`, `/teams/:id` |
| Projects | `/projects`, `/projects/:id` |
| Tasks | `/tasks` |
| Calendar | `/calendar` |
| Meetings | `/meetings`, `/meetings/:id`, `/meetings/:id/edit`, `/meetings/categories` |
| Mail | `/mail` |
| Coaching | `/coaching`, `/coaching/:id` |
| Statistics | `/statistics` |
| Network | `/network` |
| Feedback (admin) | `/feedback` |

---

## Maintenance

When adding or renaming a route or changing module scope:

1. Update this file.
2. Update `user-flows.md` for journey-level detail.
3. Update `feature-requests.md` if scope crosses “implemented” vs “planned”.
