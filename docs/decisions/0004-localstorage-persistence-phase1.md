# ADR-0004: localStorage project persistence behind an async repository interface (Phase 1)

- Status: accepted (interim; revisited in Phase 4)
- Date: 2026-08-22

## Context

Phase 1 must survive browser refreshes without Firebase. Options: localStorage (synchronous,
~5 MB, simplest), IndexedDB (async, larger quota, more API surface), OPFS (file-oriented,
better suited to SQLite bytes later).

## Decision

Store ERD project JSON in localStorage behind a `ProjectRepository` interface whose methods are
async. All loads validate with Zod; corrupt/invalid documents return `null` instead of
crashing.

## Consequences

- Minimal code for the Phase 1 acceptance criterion (reload-safe ERD).
- The async interface lets Phase 4 swap in IndexedDB and/or Firestore sync without touching
  callers.
- ERDs are small (tens of KB), so the localStorage quota is not a realistic constraint for
  this data type; SQLite bytes (Phase 2) deliberately go to OPFS instead.
- Data is per-browser until Phase 4 sync arrives — communicated in the UI ("local mode").
