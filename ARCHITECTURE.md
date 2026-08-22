# Architecture

Database Learning Lab is a **local-first** React PWA. Everything a student needs to design an
ERD and (from Phase 2) manipulate a SQLite database runs in the browser; Firebase is a
synchronization and collaboration layer, never an execution environment.

```text
React PWA
   |
   +-- ERD Designer (React Flow canvas + inspector + validation)
   |
   +-- SQLite WASM service (Phase 2)
   |
   +-- OPFS / IndexedDB persistence (Phase 2; ERD uses localStorage today)
   |
   +-- SQL Editor (Phase 3)
   |
   +-- Query Result Viewer (Phase 3)
   |
   +-- Firebase synchronization (Phase 4+)
```

## Module map

```text
src/
  app/            router, PWA registration
  components/     shared layout (AppLayout)
  features/
    dashboard/    student dashboard (placeholder for assignments)
    projects/     project list: create/open/rename/delete
    erd/
      domain/     schema (zod), factories, validation engine  <- pure, tested
      components/ React Flow canvas, table node, inspector,
                  validation panel, relationship dialog, adapters
      ErdEditorPage.tsx
  lib/
    firebase/     Firebase config scaffold (Spark plan only)
    persistence/  ProjectRepository interface + localStorage impl
  stores/         Zustand stores (erdEditorStore: undo/redo + autosave)
  styles/         global CSS
  test/           vitest setup + jsdom polyfills
```

## ERD state flow

1. **Domain model is the single source of truth.** `ErdProject` (tables, columns,
   relationships, viewport) lives in `useErdEditorStore` and is validated by Zod whenever it is
   loaded from persistence or imported (spec §10, §39).
2. **React Flow is a view.** `flowAdapter.ts` derives nodes/edges from the domain model; canvas
   events (drag, connect, delete) are translated back into store actions. The ERD JSON never
   depends on React Flow internals.
3. **Undo/redo** is temporal state in the store: `past`/`future` stacks around the present
   project, with label-based coalescing for typing bursts and gesture handling for drags
   (ADR-0005).
4. **Autosave**: mutations mark the project dirty, then a debounced write goes to the local
   `ProjectRepository`. Firestore debouncing (5–10 s, spec §19) is added in Phase 4; local
   writes use a 1 s debounce. A `beforeunload` flush prevents losing work on tab close.

## Validation

`validateErd(project)` is a pure function producing `ValidationIssue[]`
(`error | warning | info`, spec §9). Only `error` severity will block database generation in
Phase 2; warnings never block work. Rules implemented in Phase 1:

- table/column names present and unique (case-insensitive)
- primary key recommended; composite PK detected as info
- FK target table/column existence, type compatibility, duplicate and orphan relationships
- standard SQL identifier check (quoted-identifier warning)
- empty-table warning

## Persistence strategy

| Data           | Phase 1                            | Later phases                                  |
| -------------- | ---------------------------------- | --------------------------------------------- |
| ERD projects   | localStorage (JSON, Zod-validated) | Firestore project docs (Phase 4)              |
| SQLite bytes   | —                                  | OPFS primary, IndexedDB fallback (Phase 2)    |
| Cloud snapshot | —                                  | Firestore chunking + gzip + SHA-256 (Phase 5) |

The `ProjectRepository` interface is async so the backing store can change without touching
callers (ADR-0004).

## Roles

Student and lecturer roles arrive with Firebase Auth in Phase 4. Roles are stored in Firestore
and enforced by security rules — never trusted from the client (spec §5, §28).
