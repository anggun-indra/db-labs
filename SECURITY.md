# Security

Security principles from spec §28 and §39, adapted per phase.

## Identity

- Firebase Authentication is the **single identity provider** (Google Sign-In primary,
  email/password fallback). `uid` is canonical everywhere (spec §2.2).
- Roles (`student` / `lecturer`) live in Firestore `users/{uid}` and are enforced by security
  rules. Client-supplied role flags are never trusted.

## Authorization (Firestore Rules — Phase 4+)

- Students: read/write only their own profile, projects, snapshots; submit their own work.
- Lecturers: read projects/submissions for their course; manage assignments; write grades.
- Snapshot writes require authentication and ownership; public reads are avoided unless they
  materially simplify a phase (spec §28 prefers authenticated reads).
- Rules are tested with the Firebase Emulator Suite where practical.

## Frontend hygiene

- The Firebase public web config may ship in the frontend (by design); admin credentials and
  service-account JSON **never** appear in the repo or bundle.
- All ERD JSON crossing a boundary (persistence load, file import) is validated with Zod;
  invalid documents are rejected, not crash-inducing (spec §39).
- Snapshot metadata is validated; every snapshot carries a SHA-256 checksum verified before
  import. Failed verification never imports and never destroys the local database (spec §22).
- Size limits guard uploads (3 MB warn / 5 MB block, configurable).

## SQL execution

- SQL runs only inside the isolated local SQLite WASM instance in the student's/lecturer's own
  browser. There is no server-side SQL execution anywhere in this product (spec §39, §27).

## Dependency policy

- No paid cloud services, no Firebase Storage, no extra auth providers, no external backend
  (spec §38, §45). New dependencies need a documented reason.

## Known Phase 0/1 posture

Phases 0/1 are fully local: no network calls, no accounts, data lives in this browser's
localStorage. The PWA service worker caches only the application shell — never API/Firestore
traffic (spec §30).
