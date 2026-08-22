# Deployment Guide — Database Learning Lab

How to ship the app for a real class on the **Firebase free (Spark) plan**:
Auth (email/password) + Firestore + Hosting. No Storage, no Blaze plan.

## Prerequisites

- Node.js ≥ 20 and npm
- A Google account with access to the [Firebase console](https://console.firebase.google.com)
- The Firebase CLI: `npm i -g firebase-tools && firebase login`

## 1. Create the Firebase project

1. Firebase console → **Add project** → name it (e.g. `database-learning-lab`).
2. Google Analytics: **off** (not needed; keeps the deployment privacy-friendly).
3. In the project, enable:
   - **Authentication → Sign-in method → Email/password** (enable).
   - **Firestore Database → Create database** (production mode, region close to your campus).

## 2. Register the web app and copy config

1. Project settings → **Your apps → Web** → register app (no Hosting checkbox needed).
2. Copy the `firebaseConfig` values into a git-ignored `.env.local` at the repo root:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`.env.local` is git-ignored (`*.local`). **These are public web keys, not secrets —
never place a service-account JSON in this repo (spec §38).** Without the variables
the app automatically runs in local-only mode.

For local testing against the Firebase emulators, additionally set
`VITE_FIREBASE_AUTH_EMULATOR_URL` and `VITE_FIRESTORE_EMULATOR_HOST` (see `.env.local`
workflow in TESTING.md); leave them unset for production builds.

## 3. Deploy security rules first

```bash
firebase deploy --only firestore:rules
```

The rules (`firestore.rules`) enforce roles, ownership, publication visibility and
submission immutability server-side. Verify them locally before deploying:

```bash
firebase emulators:start --only firestore &
npm run test:rules
```

## 4. Seed roles and the first course (admin, one-time)

Roles are stored server-side in `users/{uid}`. After a lecturer signs up once in the
app, set their role via the Firestore console:

- `users/{uid}` → add field `role` (string) = `lecturer` (students default to `student`).

Create the first course (also Firestore console, `courses/{courseId}`):

```json
{
  "courseId": "database-management",
  "title": "Manajemen Database",
  "description": "...",
  "lecturerUid": "<the lecturer's uid>",
  "createdAt": "<ISO timestamp>"
}
```

(Phase 6 keeps course creation admin-side; students and lecturers only read them.)

## 5. Build and deploy hosting

```bash
npm run build
firebase deploy --only hosting
```

The PWA (app shell + Monaco + SQLite WASM, ~9.6 MiB precache) works offline after the
first visit. Firestore traffic is **never** service-worker-cached.

## 6. Smoke test (release checklist)

Run locally before every release:

```bash
npx eslint .            # 0 warnings
npx tsc -b --noEmit     # clean
./node_modules/.bin/vitest run   # unit + integration
npm run build           # production build
npx playwright test     # critical e2e flows
npm run test:rules      # with the Firestore emulator running
```

Critical flows to eyeball manually once per release: login → create ERD → generate DB
→ run SQL → cloud save → restore snapshot → start assignment → submit → lecturer
review → grading.

## Rollback

Hosting keeps previous releases: Firebase console → Hosting → release history →
**Rollback**. Firestore rules can be rolled back the same way. Data documents are
never deleted by deployments.

## Quota expectations (~30 students, Spark plan)

- Project sync is debounced (5 s write-behind) — edits burst locally, one write per pause.
- SQLite snapshots upload **only** on explicit Save Database / submission; 450 KiB chunks,
  gzip, 3 MB warn / 5 MB block; manual snapshots retain only the latest per project.
- Developer diagnostics (`[quota]` console.debug lines) show every sync push and
  snapshot chunk count for auditing write patterns.
