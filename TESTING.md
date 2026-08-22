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
