# Product: Teams module

Canonical spec for the **Teams** feature (attention board per team). Complements [`modules.md`](./modules.md).

## Decisions (agreed)

| Topic | Choice |
|--------|--------|
| **Team list attention** | **Weighted** score: base weight + unread + age (stale) + important-style labels (see `emailAttentionWeight` in `stores/teams.ts`). |
| **Email → column** | **Hybrid**: auto-assign when sender email matches a contact (`Person.email`); otherwise **manual** assignment via `teamMailMeta` (and “Assign inbox” flow). |
| **Team vs `Person.team`** | **Independent** entities. A person can belong to **multiple** teams. |
| **Column order** | User-selectable: **alphabetical** (by name), **manual**, or **manual with arrow reorder** (labeled “drag” in UI until true drag-and-drop exists). |
| **Card fields (v1)** | **Subject**, **relation to project** (optional, persisted on meta), **date**. |
| **Scope** | New nav module, **Firestore** for teams + mail metadata, inbox integration via existing **mail** stack. |

## Data model (Firestore)

| Collection | Purpose |
|------------|---------|
| `teams` | `userId`, `name`, `description?`, `columnLayoutMode`, `memberPersonIds[]`, timestamps. |
| `teamMailMeta` | Per user/team/email: `accountId`, `emailId`, `personId` (column), `projectId?`, timestamps. |

### Deploying Firestore for Teams

If the UI shows **Missing or insufficient permissions** for Teams, the Firebase project usually does not yet have the **`teams`** / **`teamMailMeta`** rules (or composite indexes) from this repo.

From the `organizer-app` directory (with Firebase CLI logged in to the correct project):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

See [`docs/firestore-deployment.md`](../firestore-deployment.md) for details. Rules require a **signed-in Firebase user** (`request.auth.uid`); a Pinia “user” alone (e.g. stale persist or demo mode without real Auth) is not enough.

## Behaviour summary

- **List (`/teams`)**: Cards per team with weighted **attention** total (inbox slice up to 100 + **open tasks** assigned to any team member via `assignee` / `assignedTo` / `delegated` + `delegatedTo`).
- **Board (`/teams/[id]`)**: Columns = members; cards = **emails** (unread + auto match, or inbox item with manual meta) and **tasks** (status todo / inProgress / delegated, column = assignee). Per-column **+** opens TaskForm restricted to team members with assignee prefilled.
- **Unassigned inbox**: Messages that do not appear on the board can be assigned to a column (+ optional project).
- **Mail**: Requires connected mail accounts (same as Mail module). Without mail, board shows empty states / warnings.

## Future

- True **drag-and-drop** column reorder.
- Additional **plugins** (non-email) feeding the same card model.
- Deeper **open message** integration (deep link to thread in Mail).

## Related code

- `types/models/team.ts`, `stores/teams.ts`, `composables/useTeamAttentionBoard.ts`
- `pages/teams/index.vue`, `pages/teams/[id].vue`
- `firestore.rules`, `firestore.indexes.json`
