# SQLite

SQLite execution is always **local to the browser** (spec §3). Firebase never runs SQL. This
document describes the planned Phase 2 runtime; Phase 0/1 ships no SQLite code yet.

## Runtime choice

- Prefer **official SQLite WASM** (`sqlite-wasm` / `@sqlite.org/sqlite-wasm`) with the
  **OPFS VFS** when the browser supports it (spec §4: do not default to `sql.js`).
- Fallback path for browsers without OPFS: in-memory DB persisted manually to IndexedDB
  (export/import bytes on change), documented as degraded mode.

## Service abstraction (spec §12)

Raw SQLite objects are never exposed to React components. A dedicated service layer owns the
database lifecycle:

```ts
interface SqliteDatabaseService {
  create(projectId: string): Promise<void>
  open(projectId: string): Promise<void>
  execute(sql: string): Promise<QueryExecutionResult>
  exportDatabase(): Promise<Uint8Array>
  importDatabase(bytes: Uint8Array): Promise<void>
  close(): Promise<void>
  reset(): Promise<void>
}
```

`QueryExecutionResult` distinguishes result sets (columns + rows) from statements (affected
row count), carries execution time, and maps raw SQLite errors into the student-friendly
message format of spec §15 (rule-based hints, no LLM).

## Persistence (spec §13)

- OPFS file per project database; refresh-safe by default.
- Local project metadata records which SQLite database exists and when it was last saved.
- No Firebase round-trip is ever required to run SQL.

## Schema generation (spec §11)

The ERD-to-DDL generator is deterministic, escapes identifiers, preserves FK relationships,
supports composite keys, and the generated DDL is always shown to the student before execution
(teaching requirement). See `phase-2-sqlite-generation.md` at the repo root for the full phase
plan.

## Limits

Educational datasets only: warn at 3 MB, block cloud snapshots above 5 MB uncompressed
(spec §24). Query results display paginated (default 500 rows, spec §47) without altering the
actual SQL result.
