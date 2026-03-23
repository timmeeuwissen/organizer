# `config/`

Business and application definitions should live here and be read at runtime instead of hard-coding in components (see `config-i18n-client-server.mdc`).

## Current files

- `modules.yaml` — route segments and i18n keys for module titles (used with `locales/*.ts` today; YAML i18n can consume these keys in a later migration).

## Note

Environment-specific values belong in `.env` / `runtimeConfig`, not in committed secrets.
