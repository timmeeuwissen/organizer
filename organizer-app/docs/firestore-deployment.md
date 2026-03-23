# Firestore rules and indexes

The app expects **Cloud Firestore security rules** and **composite indexes** to match the files in the project root:

- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json` (points Firestore at those files)

## Deploy

Install the [Firebase CLI](https://firebase.google.com/docs/cli), log in, and select the same project as your app’s `FIREBASE_*` / runtime config:

```bash
cd organizer-app
firebase login
firebase use <your-project-id>   # if needed
firebase deploy --only firestore:rules,firestore:indexes
```

After changing queries (e.g. new `where` + `orderBy` combinations), deploy **indexes** as well.

If the app logs **The query requires an index** with a Firebase Console link, you can either:

- **Open the link** and confirm **Create index** (build can take a few minutes), or  
- Run `firebase deploy --only firestore:indexes` so indexes from `firestore.indexes.json` (including `teams`: `userId` + `name` + `__name__`) are applied to your project.

## Teams module permissions

Collections **`teams`** and **`teamMailMeta`** are guarded like other user-owned data: reads and writes are allowed only when `request.auth.uid` matches the document’s `userId`.

If you see **Missing or insufficient permissions**:

1. **Deploy rules** (above) — local changes are not active until deployed.
2. **Sign in with Firebase Auth** — rules use `request.auth`, not the Pinia profile alone. If the session expired, sign out and sign in again.
3. **Demo / auth bypass** — with mock Firebase, Firestore in the client may not match production behaviour; use a real sign-in for Teams.

## Related product docs

- [`docs/product/teams.md`](./product/teams.md)
