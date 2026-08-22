# SQLite

SQLite execution is always **local to the browser** (spec §3). Firebase never runs SQL.
Phase 2 implemented this runtime; see `docs/decisions/0006-sqljs-byte-persistence.md` for the
engine decision.

## Runtime

- Engine: **sql.js** (SQLite compiled to wasm). The official sqlite-wasm OPFS VFS was rejected
  because it requires cross-origin isolation (COOP/COEP), which conflicts with the Firebase
  Google Sign-In popup flow (ADR-0006).
- The wasm artifact is precached by the PWA service worker (`wasm` is in the precache glob),
  so SQL execution works offline after first load.
- `PRAGMA foreign_keys = ON` is enforced on every connection. Note: sql.js `export()` resets
  connection state; the service re-applies the pragma after every export.

## Service abstraction (spec §12)

Raw SQLite objects are never exposed to React components. `src/lib/sqlite/sqlJsRuntime.ts`
owns the lifecycle:

```ts
interface SqliteDatabaseService {
  create(projectId: string, ddl: string): Promise<void>
  open(projectId: string): Promise<boolean>
  execute(sql: string): Promise<QueryExecutionResult>
  exportDatabase(): Promise<Uint8Array>
  importDatabase(projectId: string, bytes: Uint8Array): Promise<void>
  close(): Promise<void>
  reset(projectId: string): Promise<void>
  isOpen(): boolean
  currentProjectId(): string | null
  storageKind(): string // 'opfs' | 'indexeddb' | 'memory'
  introspect(): TableInfo[]
  flush(): Promise<void>
}
```

`QueryExecutionResult` distinguishes result sets (columns + rows) from mutations (affected row
count), carries execution time, and maps raw SQLite errors into student-friendly hints
(rule-based, no LLM — `src/lib/sqlite/errorHints.ts`).

## Persistence (spec §13)

- One file per project: OPFS `dblab-databases/{projectId}.sqlite` when OPFS exists,
  otherwise IndexedDB `dblab-databases.databases` (byte blob per project).
- Mutations persist via debounced (300 ms) byte export; flush on navigation/close.
- Import/export of `.sqlite` bytes is supported from the Database page.
- No Firebase round-trip is ever required to run SQL.

## Schema generation (spec §11)

The ERD-to-DDL generator (`src/lib/sqlite/ddlGenerator.ts`) is deterministic:

- Topologically orders tables by FK dependency (stable; warns when reordered).
- Quotes identifiers that are keywords or contain unsafe characters (double-quote escaping).
- Teaching types map directly to SQLite declarations (SQLite derives affinity): BOOLEAN and
  DATETIME defaults are rendered sensibly (`CURRENT_TIMESTAMP` stays a keyword, numeric
  defaults stay raw, everything else becomes a quoted literal).
- Composite primary keys become table constraints; FK side follows the ERD cardinality
  convention (`foreignKeySide`).
- Warnings: empty tables skipped, tables without PK, reordered tables.
- The generated DDL is always shown (copy/download `.sql`) before execution, with an explicit
  data-loss warning on rebuild.

Schema introspection (`sqlite_master` + `PRAGMA table_info/foreign_key_list/index_list`)
powers the Schema Explorer, and drift detection compares ERD vs live schema (spec §42).
Phase 2 does not auto-migrate: on drift the student backs up and rebuilds.

## Limits

Educational datasets only: warn at 3 MB, block cloud snapshots above 5 MB uncompressed
(spec §24). Query results display paginated (default 500 rows, spec §47) without altering the
actual SQL result. The Schema Explorer browses rows read-only in pages of 50.
