# Rules scope: Firebase-first organizer-app

This product **persists data in Firebase Auth + Firestore** and external APIs (Google, Microsoft, AI providers). It does **not** use a relational database as the primary application store.

## Relationship to global Cursor rules

- **database-fixtures.mdc** applies to SQL-backed projects. This app is **exempt** by product decision; see [data-storage.md](./data-storage.md) and [.cursor/rules/database-fixtures-scope.mdc](../../.cursor/rules/database-fixtures-scope.mdc).
- **gui-module-conventions.mdc**, **apis-and-contracts.mdc**, **cli-and-makefile.mdc**, and others are **partially** implemented; the [rules overview](../../docs/rules-overview.md) tracks alignment.
- When a rule assumes SQL, Helm, or full DDD GUI patterns, treat it as **guidance** unless the product docs explicitly adopt that scope.

## Direction

Prefer documenting scope in `docs/product/` before expanding implementation to match every global rule file.
