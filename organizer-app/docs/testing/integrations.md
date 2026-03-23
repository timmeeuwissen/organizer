# Integration testing notes

## Automated (Vitest)

Provider unit tests under `tests/unit/utils/api/` mock HTTP and cover Google/Microsoft mail, calendar, contacts, tasks, plus shared utilities. No live OAuth tokens are required.

## Credential-gated (manual / optional)

Full OAuth round-trips, live mailbox/calendar reads, and provider rate limits are **not** required for default CI. To exercise real APIs locally, configure integration accounts in the app and run through the UI; optionally add env-gated `describe.skip` suites later.

## End-to-end

- Interactive: `make test-e2e` / `npm run test:e2e`
- Headless: `make test-e2e-run` / `npm run test:e2e:run`

Keep Cypress specs limited to flows that do not require real third-party credentials.
