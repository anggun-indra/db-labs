# Testing

## Layers

| Layer       | Tool                       | Scope                                         |
| ----------- | -------------------------- | --------------------------------------------- |
| Unit        | Vitest                     | ERD domain: factories, validation, adapters   |
| Store       | Vitest                     | Zustand editor: undo/redo, gestures, autosave |
| Persistence | Vitest + in-memory Storage | repository roundtrip, corruption handling     |
| Component   | Vitest + React Testing Lib | TableNode rendering, ProjectsPage flows       |
| End-to-end  | Playwright (chromium)      | boot, project create, add table, reload, undo |

## Commands

```bash
npm run test          # unit + component (jsdom)
npm run test:watch
npm run test:e2e      # Playwright against the production build (vite preview)
```

E2E runs against `vite preview` (production build) to approximate Firebase Hosting.

## Firestore rules tests (emulator, opt-in)

Authorization is enforced in `firestore.rules`, verified with
`@firebase/rules-unit-testing` against a real emulator:

```bash
# terminal 1
firebase emulators:start --only firestore   # port 8080

# terminal 2
npm run test:rules
```

The suite is opt-in: without `FIRESTORE_EMULATOR_HOST` the rules tests skip
themselves (CI without the emulator stays green; a plain TCP probe is NOT enough
because port 8080 can host unrelated services). If port 8080 is taken, start the
emulator with a git-ignored override config (e.g. `firebase.emulator.local.json`
with `firestore.port: 8081`) via `firebase emulators:start --config <file>` and
point `FIRESTORE_EMULATOR_HOST` at that port. The suite clears emulator data on
startup, so it is safe to re-run back-to-back. Coverage: users role documents,
project ownership, snapshot ownership/immutability, assignment publication
visibility, submission ownership + grading-only updates.

## Environment notes

- jsdom lacks `matchMedia`/`ResizeObserver` (needed by antd and React Flow); polyfills live in
  `src/test/setup.ts`.
- Node ≥ 22 ships an inert experimental `localStorage` that shadows jsdom's on Node 25. Tests
  install a deterministic in-memory `Storage` instead (`src/test/memoryStorage.ts`).

## What Phase 1 tests cover

- validation engine: every rule code has at least one positive case, severity ordering,
  blocking-error detection
- factories: id uniqueness, defaults, duplicate-table deep copy, FK side convention,
  endpoint resolution, type compatibility
- flow adapters: node/edge derivation, FK badges, selection preservation, broken-reference
  labels
- editor store: undo/redo roundtrips, typing coalescing, drag-gesture single history step,
  cascade removal of relationships, viewport excluded from history, debounced autosave flush
- repository: roundtrip, index ordering/tie-breaks, corrupted JSON/schema rejection
- components: table node rendering states; project create/list/delete flows

## Future gates (spec §46)

As phases land, add: DDL generator golden tests, SQLite runtime integration tests, snapshot
compress/chunk/checksum tests, Firestore rules tests (emulator), and Playwright coverage for
login → ERD → generate → SQL → save → snapshot → submit → review.
