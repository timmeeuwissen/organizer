# Data storage (canonical)

This document is the **single source of truth** for how Organizer App persists data and how that relates to workspace rules.

## Primary store

- **Firebase Authentication** for sign-in.
- **Cloud Firestore** for application data (behaviors, people, projects, tasks, meetings, integrations metadata, teams, coaching, etc.).
- Client-side caching and offline behavior follow Firebase SDK and app design.

## Explicitly out of scope for this product

- A **relational database** as the primary application store.
- **`data/fixtures/*.sql`**, **`make db-truncate`**, **`make db-load-fixture`**, and **`server/utils/database.ts`-style** SQL access as described in `.cursor/rules/database-fixtures.mdc` in this repository.

Those rules (see repository root `.cursor/rules/database-fixtures.mdc`) apply to **SQL-backed** projects. Organizer App is **Firebase-first** by product choice and does not treat the absence of SQL fixtures as a backlog item unless the storage strategy changes.

## Optional seed / demo data

If the app needs sample or demo data in Firestore, that is a **separate concern** from SQL fixture rules (e.g. scripts or emulator imports). Document any such flow in the README or `scripts/` when added.

## External APIs

Mail, calendar, contacts, and tasks may sync with **Google** and **Microsoft** (Exchange / Microsoft 365) APIs. That data lives at the provider unless copied into Firestore by the app.

## Integration testing (automated vs manual)

- **CI (Vitest):** Provider modules are tested with **mocked HTTP**—no live OAuth tokens required.
- **Live OAuth round-trips** (full mailbox/calendar against real tenants) are **manual** or require credential-gated environments; they are not required for a green default CI run.

See tests under `tests/unit/utils/api/` for provider coverage.
