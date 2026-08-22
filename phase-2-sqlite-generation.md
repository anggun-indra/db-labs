# Database Learning Lab — Phase 2: SQLite Generation

## Objective

Implement deterministic ERD-to-SQL generation and a browser-local SQLite runtime so students can turn a valid ERD into a working SQLite database.

## Scope

This phase starts only after Phase 1 is stable.

Deliver:

- ERD-to-SQLite DDL generator
- DDL preview
- SQLite WASM integration
- local database creation/open/reset
- schema explorer
- database rebuild from ERD
- basic import/export database bytes
- tests for generator and runtime

Do not add Firebase features yet.

## Architecture

```text
ERD Domain Model
      |
      v
Validation Engine
      |
      v
DDL Generator
      |
      v
DDL Preview
      |
      v
SQLite WASM Runtime
      |
      v
Local Database
```

## Implementation Requirements

### 1. Deterministic DDL Generator

Create a pure function:

```ts
generateSqliteSchema(erd: ErdProject): GeneratedSchema
```

Suggested output:

```ts
type GeneratedSchema = {
  sql: string
  statements: string[]
  warnings: string[]
}
```

Requirements:

- stable ordering
- escaped identifiers
- PK support
- composite PK support
- NOT NULL
- UNIQUE
- DEFAULT
- FK constraints
- readable formatting
- no side effects

### 2. Identifier Safety

Implement a dedicated identifier quoting utility.
Do not concatenate raw names into SQL without quoting.

### 3. Type Mapping

Map teaching-oriented types to SQLite-compatible definitions and document the mapping.

### 4. DDL Preview

Before creating/rebuilding the DB, show generated SQL.
Actions:

- Copy SQL
- Download `.sql`
- Create Database
- Cancel

### 5. SQLite Service

Create an abstraction:

```ts
interface SqliteDatabaseService {
  create(projectId: string, ddl: string): Promise<void>
  open(projectId: string): Promise<void>
  execute(sql: string): Promise<QueryExecutionResult>
  exportDatabase(): Promise<Uint8Array>
  importDatabase(projectId: string, bytes: Uint8Array): Promise<void>
  close(): Promise<void>
  reset(projectId: string): Promise<void>
}
```

Keep implementation details outside React components.

### 6. Persistence

Prefer:

1. OPFS
2. IndexedDB fallback

Store DB by project ID.

### 7. Schema Explorer

Show:

- tables
- columns
- PKs
- FKs
- indexes
- CREATE TABLE statement

### 8. Rebuild Behavior

When ERD changes:

- detect schema mismatch
- warn user
- offer rebuild
- do not silently destroy data

## UX Requirements

Use beginner-friendly copy.

Example warning:

> Your ERD has changed since this database was created. Rebuilding will recreate the schema and may remove existing data.

Actions:

- Download Backup
- Rebuild
- Cancel

## Testing

Add tests for:

- simple table generation
- PK
- composite PK
- FK
- unique
- nullable
- default
- identifier escaping
- deterministic output
- DB creation
- export/import round trip

## Acceptance Criteria

A student can:

- open a Phase 1 ERD
- preview generated SQLite DDL
- create a real SQLite DB
- refresh browser
- reopen the local DB
- inspect schema
- export the DB
- rebuild from ERD intentionally

## Non-Goals

Do not implement:

- SQL editor
- visual row editor
- Firebase
- cloud snapshot
- assignment system
- grading

## Definition of Done

- lint passes
- typecheck passes
- unit tests pass
- production build passes
- SQLite works locally
- no paid dependency
- no Firebase Storage dependency

## Coding Agent Execution Prompt

Read the repository and the master specification first. Implement only Phase 2. Preserve Phase 1 behavior. Do not begin Phase 3. At completion report:

- implemented items
- files changed
- tests added
- commands run
- known limitations
- recommended Phase 3 entry point
