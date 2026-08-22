# ADR-0002: SQLite cloud snapshots via Firestore chunking (no Cloud Storage)

- Status: accepted (mandated by spec §20–§24; detailed in `phase-5-firestore-sqlite-snapshots.md`)
- Date: 2026-08-22

## Context

Firebase Spark does not include Cloud Storage for this project, but students need cloud
checkpoints of their SQLite databases so work survives device changes and can be submitted.

## Decision

Store snapshots as gzipped, chunked byte arrays inside Firestore documents:
`sqliteSnapshots/{id}` metadata + `sqliteSnapshots/{id}/chunks/{i}` data, ~400–500 KiB per
chunk, SHA-256 checksum verified before any restore.

## Consequences

- Stays on the free plan; no Storage dependency.
- Uploads are explicit checkpoints only (Save Database / submission), protecting quota.
- Chunk count and document reads scale with DB size — educational datasets are capped
  (3 MB warn / 5 MB block) to keep this cheap.
- Restore must be atomic: checksum failure aborts without touching the local database.
