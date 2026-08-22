# ADR-0001: Local-first SQLite WASM instead of server-side execution

- Status: accepted (mandated by spec §3, §4)
- Date: 2026-08-22

## Context

Students need a real database to practice with. Options: server-hosted database (cost, ops,
latency), SQLite via sql.js (memory-only persistence), or official SQLite WASM with OPFS.

## Decision

Run SQLite compiled to WebAssembly fully in the browser, preferring the official SQLite WASM
build with the OPFS VFS and an IndexedDB fallback. SQL never executes on Firebase or any
server.

## Consequences

- Works offline; zero per-query cloud cost (Spark plan compatible).
- Lecturer review also runs locally in the lecturer's browser (spec §27).
- Must manage DB bytes ourselves: export/import for snapshots (Firestore chunking, Phase 5).
- Browser support for OPFS is broad but not universal; the fallback path must stay tested.
