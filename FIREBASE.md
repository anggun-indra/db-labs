# Firebase

This project must run on the **Firebase Spark (free) plan** — no credit card, ever (spec §2.1).

## Allowed services

| Service          | Use                                                           | Phase |
| ---------------- | ------------------------------------------------------------- | ----- |
| Firebase Auth    | Google Sign-In (primary), email/password fallback             | 4     |
| Cloud Firestore  | profiles, projects, assignments, submissions, snapshot chunks | 4–7   |
| Firebase Hosting | static PWA deployment                                         | 8     |

## Forbidden

- Firebase Cloud Storage (snapshots use Firestore chunking instead — see Phase 5 doc)
- Cloud Functions that require Blaze
- paid extensions, Supabase, Cloudflare R2, external backends

## Configuration

The public web config comes from environment variables (see `.env.example`):

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

`src/lib/firebase/config.ts` initializes lazily and exposes `isFirebaseConfigured()`. The app
runs in **local mode** when unconfigured — Phases 0/1 never require Firebase.

The public web config is safe in frontend code by design; authorization is enforced by
Firebase Auth + Firestore Security Rules, never by trusting client state (see SECURITY.md).

## Phase 4: Auth + project sync

- Sign-in: Google popup (primary) plus email/password fallback, on the `/profile` page.
- Identity: the Firebase UID is canonical; roles (`student`/`lecturer`) live in
  `users/{uid}.role` and can only be granted server-side (rules reject client role changes).
- Sync: local storage stays the source of truth; `ProjectSyncService` mirrors ERD/project
  metadata to `projects/{projectId}` write-behind — 5 s debounce per project, immediate
  flush on navigation/logout, offline queueing with automatic retry on reconnect.
- Conflicts: last-write-wins by `updatedAt`; a remote document older than the local copy is
  skipped, never silently overwriting newer local work.
- Quota discipline: no live listeners, no `orderBy` on the owner query (avoids composite
  index requirements), one pull on the project list when signed in.
- SQLite bytes never sync here — the database remains fully in-browser until the explicit
  Phase 5 snapshot flow.

### Emulator & rules tests

```bash
firebase emulators:start --only auth,firestore
npm run test:rules   # runs firestoreRules tests against FIRESTORE_EMULATOR_HOST
```

`firestore.rules` enforces ownership for `users` and `projects`; deployment is
`firebase deploy --only firestore:rules,hosting`.

## Quota discipline (Spark)

Per spec §48:

- debounced autosave (5–10 s), never write-per-keystroke or write-per-drag-frame
- explicit snapshots only, never per-SQL-statement uploads
- one-time reads/pagination instead of long-lived listeners where appropriate
- conservative snapshot chunk size (~400–500 KiB)

## Hosting notes (Phase 8)

- SPA rewrite to `index.html`
- do not cache Firestore traffic in the service worker; the Firebase SDK manages its own data
