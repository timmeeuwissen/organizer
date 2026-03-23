# i18n layout

## Current approach (explicit exception)

User-visible strings are defined in **`locales/en.ts`** and **`locales/nl.ts`** (TypeScript objects). This matches the existing Nuxt + vue-i18n setup (`plugins/i18n.ts`).

## Planned / rule-aligned direction

For multilingual expansion, add **YAML message files under this directory** (e.g. per-module files) and load them via a small Nuxt plugin or build step, per `config-i18n-client-server.mdc` and `gui-module-conventions.mdc`.

## Module metadata

Route-to-title mapping for breadcrumbs/app bar is also described in `config/modules.yaml` for a future single source of truth.
