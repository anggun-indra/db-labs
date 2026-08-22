# ADR-0006: sql.js with own byte persistence instead of official sqlite-wasm OPFS VFS

Date: Phase 2 implementation. Supersedes the "prefer official sqlite-wasm with OPFS VFS"
guidance recorded in `SQLITE.md` during Phase 1.

## Context

Spec §3 requires SQLite to execute entirely in the browser. Spec §4 warned against defaulting
to `sql.js`, and the Phase 1 plan preferred the official `@sqlite.org/sqlite-wasm` build with
its OPFS VFS. Two deployment constraints surfaced while wiring Phase 2:

1. The official OPFS VFS path is only available on pages served with cross-origin isolation
   (`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`)
   because it relies on `SharedArrayBuffer`. Firebase Hosting can send those headers, but they
   break the Firebase Auth Google Sign-In popup flow (the accounts.google.com popup is
   cross-origin) unless elaborate `credentialless` workarounds are used. Phase 4 depends on
   that popup flow on the free Spark plan.
2. COEP also blocks or complicates any third-party asset (fonts, future embeds) and makes
   `vite preview`/Playwright runs require matching headers everywhere.

`sql.js` (SQLite 3 compiled to wasm via Emscripten, single connection in wasm memory) runs on
every modern browser with zero isolation requirements, and its wasm artifact is precacheable
by the PWA service worker for offline use.

## Decision

Use **sql.js** as the execution engine and implement persistence ourselves at the byte level:

- One database file per project, stored as exported SQLite bytes.
- Primary storage: **OPFS** (`dblab-databases/{projectId}.sqlite`) when available.
- Fallback storage: **IndexedDB** (`dblab-databases.databases`) when OPFS is unavailable.
- Test storage: in-memory implementation; storage is injected into the service.
- Every SQL statement that mutates the database schedules a debounced (300 ms) byte export,
  plus explicit flush on page hide/close and before expensive operations (export/import/reset).
- `PRAGMA foreign_keys = ON` is applied on every open/create.

The service abstraction of spec §12 is kept: components never touch the raw sql.js handle;
introspection returns DTOs only.

## Consequences

Positive:

- Works in all target browsers, no COOP/COEP, no conflicts with Google Sign-In popups.
- Simple, testable persistence (byte roundtrip tests run in plain Node).
- Import/export of `.sqlite` files is trivial (bytes in, bytes out), which Phase 5 snapshots
  and Phase 7 frozen submissions reuse.

Negative / mitigations:

- Whole-database re-export on every mutation is O(db size). Acceptable for educational
  datasets; spec §24 warns at 3 MB and blocks snapshots above 5 MB uncompressed.
- `db.export()` internally closes and reopens the connection, resetting connection state.
  The service re-applies `PRAGMA foreign_keys = ON` after every export (regression-tested).
- sql.js is SQLite 3.36-era; some newer syntax is unavailable. Acceptable for teaching SQL.

If cross-origin isolation ever becomes acceptable (e.g. `credentialless` COEP proves reliable
with Firebase Auth), a VFS-backed engine can be swapped in behind the same service interface.
