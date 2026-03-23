# Architecture (Derived from Codebase)

Documentation derived from the current codebase structure and implementation.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Nuxt 4 (target), Vue 3, Vuetify 3, Pug, SASS |
| State | Pinia |
| Backend | Firebase (Firestore, Authentication) |
| i18n | vue-i18n (locales in `locales/`) |
| Auth | Firebase Auth, OIDC (oidc-client-ts) |
| Infrastructure | Docker, Kubernetes, Home Assistant add-on |
| Testing | Vitest, Cypress |

---

## Directory Structure

```
organizer-app/
├── app.vue
├── components/           # Vue components
│   ├── ai/              # AI analysis and integration
│   ├── auth/             # Authentication (DemoModeToggle)
│   ├── behaviors/        # Behavior forms
│   ├── calendar/         # Calendar views and event form
│   ├── coaching/         # Coaching records and knowledge base
│   ├── common/           # Shared UI (AddButton, DialogForm, FilterCard, etc.)
│   ├── feedback/         # Feedback collection
│   ├── integrations/    # OAuth, AI, provider accounts
│   ├── mail/             # Mail compose
│   ├── meetings/         # Meeting form
│   ├── people/           # Person form
│   ├── projects/         # Project cards and forms
│   └── tasks/            # Task form
├── composables/
│   ├── useCalendarHelpers.ts
│   ├── useDataRefresh.ts
│   ├── useIntegrationProviders.ts
│   ├── useNetworkStatus.ts
│   ├── useOidcAuth.ts
│   ├── useTeamAttentionBoard.ts  # Teams inbox cards + weights
│   └── useThemeMode.ts
├── data/                 # Config and fixtures
│   ├── icons.yaml
│   ├── meetingCategories.yaml
│   └── yamlLoader.ts
├── layouts/
│   ├── blank.vue
│   └── default.vue       # Main layout with nav, dialogs, snackbar
├── locales/
│   ├── en.ts
│   └── nl.ts
├── middleware/
│   └── auth.ts
├── pages/
│   ├── auth/             # login, register, profile, callback, forgot-password
│   ├── behaviors/
│   ├── calendar/
│   ├── coaching/
│   ├── dashboard/
│   ├── feedback/
│   ├── mail/
│   ├── meetings/         # index, [id], [id]/edit, categories
│   ├── network/          # Network visualization
│   ├── people/
│   ├── teams/            # index, [id] attention board
│   ├── projects/
│   ├── statistics/
│   ├── tasks/
│   └── index.vue         # Welcome/landing
├── plugins/
│   ├── firebase.ts
│   ├── i18n.ts
│   ├── oidc.ts
│   ├── pinia-persistence.ts
│   ├── theme.ts
│   └── vuetify.ts
├── server/
│   ├── api/
│   │   ├── ai/           # analyze, test-integration
│   │   ├── auth/         # oidc-callback, refresh
│   │   ├── icons/
│   │   └── proxy.ts
│   ├── middleware/
│   │   └── morgan.ts
│   └── utils/
│       ├── auth.ts
│       └── logger.ts
├── stores/
│   ├── auth.ts
│   ├── behaviors.ts
│   ├── calendar.ts
│   ├── coaching.ts
│   ├── feedback.ts
│   ├── mail.ts
│   ├── meetings.ts
│   ├── meetings/categories.ts
│   ├── notification.ts   # Centralized messaging (success/error/info/warning)
│   ├── people.ts
│   ├── teams.ts          # teams + teamMailMeta (Firestore)
│   ├── projects.ts
│   └── tasks.ts
├── types/
│   ├── models/           # User, Behavior, Person, Project, Task, Meeting, etc.
│   ├── firebase.d.ts
│   ├── morgan.d.ts
│   └── uuid.d.ts
└── utils/api/            # Provider abstractions
    ├── aiProviders/      # BaseAIProvider, Gemini, OpenAI, XAI
    ├── calendarProviders/# Google, Exchange, Office365
    ├── contactProviders/ # Google, Exchange, Office365
    ├── mailProviders/    # Gmail, Exchange, Office365
    ├── taskProviders/    # Google, Exchange, Office365
    └── core/             # BaseProvider, oauthUtils, apiUtils
```

---

## Domain Modules (Pages/Routes)

| Module | Route | Icon | Description |
|--------|-------|------|-------------|
| Dashboard | `/dashboard` | — | Overview |
| Behaviors | `/behaviors` | mdi-account-cog | Behaviors, rationale, action plans |
| People | `/people` | mdi-account-group | Contacts and interactions |
| Teams | `/teams` | mdi-account-multiple-outline | Team attention board (inbox cards per member) |
| Projects | `/projects` | mdi-folder-multiple | Projects with pages, tasks, members |
| Tasks | `/tasks` | mdi-checkbox-marked-outline | Tasks, subtasks, comments |
| Calendar | `/calendar` | mdi-calendar | Meetings and tasks in calendar view |
| Meetings | `/meetings` | mdi-account-group-outline | Meeting summaries, attendees |
| Mail | `/mail` | mdi-email | Compose and manage mail |
| Coaching | `/coaching` | mdi-account-heart | Coaching records and knowledge base |
| Statistics | `/statistics` | mdi-chart-bar | Time and progress metrics |
| Network | `/network` | mdi-graph | Relationship visualization |
| Feedback | `/feedback` | mdi-message-text-outline | User feedback admin |

---

## Data Model (from `types/models/index.ts`)

| Entity | Key Fields |
|--------|------------|
| User | id, email, displayName, settings (language, darkMode, integrations) |
| Behavior | id, userId, title, description, rationale, type, examples, actionPlans |
| Person | id, userId, firstName, lastName, email, tags, relatedProjects/Meetings/Tasks |
| Team | id, userId, name, columnLayoutMode, memberPersonIds (see `types/models/team.ts`) |
| TeamMailMeta | id, userId, teamId, accountId, emailId, personId, projectId? |
| Project | id, userId, title, status, priority, teamMembers, tasks, pages, progress |
| ProjectPage | id, projectId, title, content, order |
| Task | id, userId, title, status, priority, projectId, subtasks, comments, recurrence |
| Meeting | id, userId, title, startTime, endTime, participants, tasks, relatedProjects |
| MeetingCategory | id, name, description, color, icon |
| IntegrationAccount | id, type, oauthData, syncCalendar/Mail/Tasks/Contacts |
| AIIntegrationData | (per aiIntegration.ts) |
| Coaching | (per coaching.ts) |
| KnowledgeDocument | (per knowledgeDocument.ts) |
| Feedback | id, userId, message, screenshot, page, seen, archived |

---

## API Integration Providers

- **AI**: BaseAIProvider, GeminiProvider, OpenAIProvider, XAIProvider
- **Calendar**: GoogleCalendarProvider, ExchangeCalendarProvider, Office365CalendarProvider
- **Contacts**: GoogleContactsProvider, ExchangeContactsProvider, Office365ContactsProvider
- **Mail**: GmailProvider, ExchangeProvider, Office365Provider
- **Tasks**: GoogleTasksProvider, ExchangeTasksProvider, Office365TasksProvider

---

## Messaging System

- **Store**: `stores/notification.ts` (Pinia)
- **Methods**: `success()`, `error()`, `info()`, `warning()`, `add()`, `dismiss()`, `clear()`
- **UI**: `NotificationSnackbar` in default layout
- **Audit**: Logs under `logs/` (audit JSON files observed)

---

## Make Targets (from Makefile)

| Target | Purpose |
|--------|---------|
| `help` | Show help |
| `setup-env` | Interactive env setup |
| `install` | npm install |
| `dev` | Start dev server |
| `build` | Production build |
| `preview` | Preview production build |
| `test` | Unit tests |
| `test-e2e` | Cypress e2e |
| `lint` / `lint-fix` | Lint and auto-fix |
| `docker-build` / `docker-run` | Docker |
| `k8s-deploy` / `k8s-status` / `k8s-delete` | Kubernetes |
| `ha-addon` / `ha-run` | Home Assistant add-on |
| `firebase-*` | Firebase setup, deploy, rules, emulate |
| `oauth-google-setup` / `oauth-ms-setup` / `oauth-setup` | OAuth setup |
| `feedback-*` | Feedback review and Claude integration |
| `init` | install + setup-env |

---

## Configuration

- **Runtime**: `nuxt.config.ts` with `runtimeConfig` for Firebase and Google
- **Env**: `.env` (from `make setup-env`); Firebase keys, XAI API, etc.
- **Data**: `data/icons.yaml`, `data/meetingCategories.yaml` loaded via `data/yamlLoader.ts`

---

## Gaps vs. Rules (for future alignment)

- **i18n**: Using `locales/*.ts`; rules prefer YAML in `i18n/`
- **Storybook**: No Storybook target yet
- **Database fixtures**: Firebase-based; no `data/fixtures/` SQL flow
- **Product docs**: `docs/product/` to be populated
- **Breadcrumbs**: Not implemented; rules require Welcome-root breadcrumbs
- **Admin card**: No data model / export icons on overview pages
- **Server-side tables**: Overview pages may not use server-side v-data-table everywhere
- **OpenAPI/MCP**: Server API does not yet expose OpenAPI or MCP
