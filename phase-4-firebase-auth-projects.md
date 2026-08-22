# Database Learning Lab — Phase 4: Firebase Auth and Project Sync

## Objective

Add user identity and cloud persistence for ERD/project metadata while keeping SQLite execution local.

## Mandatory Constraints

Use only:

- Firebase Auth
- Firestore
- Firebase Hosting

Do not use:

- Firebase Storage
- Cloud Functions requiring Blaze
- Supabase
- Cloudflare
- paid services

## Scope

Deliver:

- Firebase initialization
- Google Sign-In
- optional email/password fallback
- user profile document
- role field
- project CRUD
- ERD Firestore persistence
- debounced autosave
- save status
- offline state
- project list/dashboard

## Firestore Model

```text
users/{uid}
projects/{projectId}
```

## Auth Rules

Firebase UID is the canonical identity.
Never store admin credentials in frontend.

## Project Sync Strategy

```text
edit
 |
 v
Zustand/local persistence
 |
 v
dirty=true
 |
 v
debounce 5-10 sec
 |
 v
Firestore write
```

Flush on:

- explicit Save
- important navigation
- logout if feasible

Do not write on every drag frame or keypress.

## Save Status

Show:

- Saved
- Saving...
- Unsaved
- Offline
- Sync error

## Offline

Student must still be able to:

- edit ERD
- use SQLite
- run SQL

When offline:

- preserve local work
- retry synchronization later
- never overwrite newer local data silently

## Conflict Strategy

Phase 4 can use simple last-write-wins with timestamps, but detect obvious stale remote state and warn before destructive overwrite.

## Security Rules

Add Firestore rules:

- user can read/write own profile as appropriate
- student can CRUD own projects
- no anonymous project writes

Add emulator rules tests where practical.

## Testing

Test:

- sign-in state handling
- project create/load/update/delete
- debounce behavior
- offline indicator
- auth-protected route
- rules tests
- malformed ERD rejection

## Acceptance Criteria

Student can:

- sign in
- create project
- edit ERD
- save to Firestore
- open project from another browser/session
- continue local SQLite practice
- work temporarily offline without losing local state

## Non-Goals

Do not implement:

- SQLite cloud snapshot
- assignments
- submissions
- grading
- lecturer dashboard

## Coding Agent Execution Prompt

Implement only Phase 4. Keep SQLite local. Keep Firestore writes quota-conscious. Do not add Firebase Storage. At completion provide standard report and any Firestore index/rules notes.
