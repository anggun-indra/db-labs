# ERD Schema

The ERD domain model is versioned, framework-independent JSON validated with Zod at every
boundary (load, import). React Flow never sees or mutates this shape directly — adapters map it
to canvas nodes/edges (ADR-0003).

## Version

`ERD_SCHEMA_VERSION = 1`. Bump and add a migration when the shape changes.

## Types

```ts
interface ErdProject {
  schemaVersion: 1
  projectId: string
  name: string
  tables: ErdTable[]
  relationships: ErdRelationship[]
  viewport?: { x: number; y: number; zoom: number }
}

interface ErdTable {
  id: string
  name: string
  position: { x: number; y: number } // canvas position lives in the domain model
  columns: ErdColumn[]
}

interface ErdColumn {
  id: string
  name: string
  type: ColumnType // INTEGER | REAL | TEXT | BLOB | BOOLEAN | DATE | DATETIME | NUMERIC
  primaryKey: boolean
  nullable: boolean
  unique: boolean
  defaultValue?: string
}

interface ErdRelationship {
  id: string
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one'
}
```

## Column types

The eight teaching-oriented types map to SQLite affinities (SQLite itself is dynamically
typed; the UI explains this — spec §7):

| UI type  | SQLite affinity | Notes                                |
| -------- | --------------- | ------------------------------------ |
| INTEGER  | INTEGER         | recommended PK type                  |
| REAL     | REAL            | floating point                       |
| TEXT     | TEXT            | default choice                       |
| BLOB     | BLOB            |                                      |
| BOOLEAN  | NUMERIC         | stored as 0/1                        |
| DATE     | NUMERIC/TEXT    | teaching type; stored as text/number |
| DATETIME | NUMERIC/TEXT    | teaching type; stored as text/number |
| NUMERIC  | NUMERIC         |                                      |

## Cardinality and FK placement convention

Relationships are stored as drawn: **source ⟶ target**. The foreign-key side is derived:

| Cardinality | Label | FK lives in | Example                                     |
| ----------- | ----- | ----------- | ------------------------------------------- |
| many-to-one | N:1   | source      | orders.customer_id → customers.id           |
| one-to-many | 1:N   | target      | customers.id ← orders.customer_id           |
| one-to-one  | 1:1   | source      | profiles.user_id → users.id (by convention) |

`many-to-many` is deliberately **not** a stored cardinality: students resolve M:N through an
explicit junction table, and the UI explains why (spec §8).

## Constraints modeled in Phase 1

- `primaryKey: true` on one or more columns; multiple PK columns are a **composite** primary key
  (reported as an `info` validation issue).
- `unique`, `nullable`, optional `defaultValue` per column.
- A primary-key column is forced `nullable: false` in the UI.

## Validation

`validateErd(project): ValidationIssue[]` (spec §9) with severities `error | warning | info`.
Only `error` blocks future database generation. See `src/features/erd/domain/validate.ts` for
the authoritative list of rule codes (`TABLE_MISSING_NAME`, `DUPLICATE_TABLE_NAME`,
`DUPLICATE_COLUMN_NAME`, `COLUMN_MISSING_NAME`, `MISSING_PRIMARY_KEY`, `COMPOSITE_PRIMARY_KEY`,
`EMPTY_TABLE`, `INVALID_TABLE_IDENTIFIER`, `INVALID_COLUMN_IDENTIFIER`, `ORPHAN_RELATIONSHIP`,
`DUPLICATE_RELATIONSHIP`, `FK_TYPE_MISMATCH`, `FK_REFERENCES_NON_KEY`).
