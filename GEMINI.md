# Database Learning Lab — Project Rules & Guidelines

## Core Architecture & Invariants

1. **Local-First & In-Browser Execution**:
   - SQLite executes entirely inside the browser via WASM (`sql.js`). Never run or emulate SQLite on Firebase/cloud functions.
   - ERD domain model (`ErdProject`) is decoupled from React Flow view models. Domain state lives in Zustand and is strictly validated with Zod.

2. **Firebase Spark Plan Constraints (Strict Free Tier)**:
   - Only use Firebase Auth, Firestore, and Hosting.
   - **NEVER** introduce Cloud Storage, Cloud Functions, or paid extensions.
   - Large SQLite files (>1 MiB) are chunked into 450 KiB Firestore documents with gzip and SHA-256 integrity verification.

3. **Security & Role Enforcement**:
   - Deny-by-default in `firestore.rules`.
   - Roles (`student` vs `lecturer`) live in Firestore `users/{uid}` and are never trusted from client-side state.
   - Fixture document IDs must strictly match their path IDs in rules tests.

4. **Code Quality & Release Gates**:
   - Always verify changes with `npm run gates` (or `npm run gates:quick`).
   - Zero ESLint warnings policy under strict TypeScript config.
   - All tests (Vitest + Playwright) must pass before committing.

5. **Deployment Invariant**:
   - **NEVER** deploy to Firebase or trigger `firebase deploy` / hosting release unless explicitly and directly commanded by the user in that prompt.
