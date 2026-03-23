# User Flows

Human-readable user journeys derived from the current codebase. Back these flows with behavioral tests where possible.

---

## Authentication

1. User opens app → redirected to login if not authenticated
2. User signs in with Firebase (email/password) or OIDC
3. On success → redirect to dashboard
4. User can register, forgot password, or view profile
5. Demo mode: when `VITE_AUTH_BYPASS=true`, auth is bypassed

---

## Quick-Add (from Layout)

1. User clicks `+` in top bar
2. Menu shows: Behaviors, Projects, Tasks, People, **Create team** (→ Teams), Calendar Event, Meeting, Coaching, Knowledge Document, Mail
3. User selects an option → overlay opens with the corresponding form
4. User fills form → Save persists and closes overlay; Cancel closes without saving

---

## Navigation

1. User opens drawer via hamburger icon
2. Drawer shows: Behaviors, People, **Teams**, Projects, Tasks, Calendar, Meetings (with Categories sub-item), Mail, Coaching, Statistics, Network, Feedback
3. Clicking a nav item navigates to that module
4. Add icon on nav item opens the same quick-add form for that module
5. Dashboard link at top of drawer
6. Top bar: App name, + menu, AI button, theme toggle, locale, refresh, profile, logout

---

## Behaviors

1. User goes to `/behaviors`
2. Overview of behaviors (do well, want to do better, need to improve)
3. Add via quick-add or page-level add
4. Each behavior has title, description, rationale, type, examples, action plans

---

## Teams

1. User goes to `/teams` (or `+` → Create team → `/teams?new=1` opens create dialog)
2. **List**: sees team cards with **Attention** score (weighted inbox items across members) and member count; creates a team with name/description
3. User opens a team → `/teams/[id]`
4. **Board**: chooses **column order** (alphabetical / manual / arrow reorder)
5. **Members**: adds people from **People** who are not yet on the team; removes with × on column header
6. **Cards**: **Email** — inbox messages when sender matches contact (unread) or after **manual assign**; optional **project** on mail meta. **Task** — open tasks (to do / in progress / delegated) whose assignee is that column’s person (`assignee`, `assignedTo`, or `delegated` + `delegatedTo`); project from `projectId` / `relatedProjects`; due date shown.
7. **+** on column header → new task dialog: assignee choices limited to **team members**, default assignee = column person.
8. Card click → **Mail** for email cards, **Tasks** with `?id=` for task cards; refresh reloads people, projects, tasks, inbox slice

---

## People

1. User goes to `/people`
2. List of contacts with name, email, tags, relations
3. Add person via quick-add or page
4. Person can be linked to projects, meetings, tasks

---

## Projects

1. User goes to `/projects`
2. List of projects (cards or table)
3. Add project via quick-add or page
4. Project detail at `/projects/[id]` with pages, tasks, team
5. Project has status, priority, progress, due date

---

## Tasks

1. User goes to `/tasks`
2. List of tasks with filters (status, priority, project, etc.)
3. Add task via quick-add or page
4. Task has subtasks, comments, recurrence, assignee, project link
5. Task can be stored in Organizer or external provider (Google Tasks, etc.)

---

## Calendar

1. User goes to `/calendar`
2. Views: Day, Week, Month, Schedule
3. Events from Organizer + integrated calendars (Google, etc.)
4. Add event via quick-add
5. Events link to meetings and tasks

---

## Meetings

1. User goes to `/meetings`
2. List of meetings with filters
3. Meeting detail at `/meetings/[id]`; edit at `/meetings/[id]/edit`
4. Categories at `/meetings/categories`
5. Meeting has participants, summary, tasks, related projects

---

## Mail

1. User goes to `/mail`
2. Compose mail via quick-add or page
3. Can use Organizer storage or external provider (Gmail, etc.)
4. OAuth for Gmail integration

---

## Coaching

1. User goes to `/coaching`
2. List of coaching records
3. Detail at `/coaching/[id]`
4. Knowledge base and knowledge document form
5. Add via quick-add or page

---

## Statistics

1. User goes to `/statistics`
2. Views time on projects, behaviors, tasks
3. Meeting stats
4. Task completion stats

---

## Network

1. User goes to `/network`
2. Interactive graph (vis-network) of relationships
3. Entities: people, projects, tasks, meetings
4. Click to navigate to detail

---

## Feedback

1. User clicks feedback button (floating when authenticated)
2. Submits message, optional screenshot, console logs
3. Admin goes to `/feedback` to review
4. Optional: send to Claude for processing via `make feedback-to-claude`

---

## Data Refresh

1. User clicks refresh icon in top bar
2. All integrated data is refreshed from external providers
3. Loading state and error display if refresh fails
