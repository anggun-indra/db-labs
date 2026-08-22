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

## Quota discipline (Spark)

Per spec §48:

- debounced autosave (5–10 s), never write-per-keystroke or write-per-drag-frame
- explicit snapshots only, never per-SQL-statement uploads
- one-time reads/pagination instead of long-lived listeners where appropriate
- conservative snapshot chunk size (~400–500 KiB)

## Hosting notes (Phase 8)

- SPA rewrite to `index.html`
- do not cache Firestore traffic in the service worker; the Firebase SDK manages its own data
