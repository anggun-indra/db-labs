# Database Learning Lab — Phase 3: SQL Playground

## Objective

Turn the local SQLite runtime into an educational SQL practice environment.

## Scope

Deliver:

- Monaco SQL editor
- execute selected/current SQL
- result table
- SQL history
- schema browser integration
- query timing
- affected row count
- beginner-friendly errors
- visual row editor
- CSV export where useful

## Layout

```text
+--------------------------------------------------+
| Project / DB status                              |
+----------------------+---------------------------+
| Schema Explorer      | SQL Editor                |
|                      |                           |
| customers            | SELECT *                 |
| orders               | FROM customers;          |
|                      |                           |
+----------------------+---------------------------+
| Results / Messages / History                     |
+--------------------------------------------------+
```

## SQL Editor Requirements

- Monaco Editor
- SQL syntax highlighting
- Run button
- keyboard shortcut
- run selection if selected
- otherwise run current editor content
- clear editor
- preserve draft per project locally

## Query Result Contract

```ts
type QueryExecutionResult = {
  kind: 'rows' | 'mutation' | 'error'
  columns?: string[]
  rows?: unknown[][]
  affectedRows?: number
  executionTimeMs: number
  error?: {
    raw: string
    code?: string
    hint?: string
  }
}
```

## Result Viewer

Support:

- tabular display
- row count
- execution time
- horizontal scroll
- pagination / capped rendering
- copy
- CSV export

Default render cap may be 500 rows.
Do not silently modify SQL to add LIMIT.

## SQL History

Store locally:

- SQL text
- timestamp
- success/failure
- execution time

Allow re-run.

## Error Education Layer

Rule-based only.
Examples:

- no such table
- no such column
- syntax error
- constraint failed
- UNIQUE constraint failed
- FOREIGN KEY constraint failed

Show:

1. raw SQLite error
2. simple hint

## Visual Data Editor

For a selected table:

- browse rows
- add row
- edit row
- delete row
- pagination

Show generated SQL when practical.

## Safety

All SQL runs only in the local browser SQLite DB.
No server-side execution.

## Testing

Test:

- SELECT result
- INSERT/UPDATE/DELETE affected rows
- error mapping
- history
- visual editor mutation
- CSV export
- selection execution
- large result rendering guard

## Acceptance Criteria

Student can:

- create sample data
- run SELECT
- run JOIN
- run GROUP BY
- see results
- understand common errors
- edit data visually
- inspect generated mutation SQL

## Non-Goals

Do not implement:

- Firebase login
- project sync
- cloud snapshots
- assignments
- lecturer mode
- AI hints

## Definition of Done

- SQL playground stable
- SQLite local-only
- lint/typecheck/tests/build pass
- responsive enough for laptop/tablet
- no regression in Phase 1/2

## Coding Agent Execution Prompt

Implement only Phase 3 on top of completed Phase 1 and 2. Keep all SQL execution local. Do not introduce backend services. At completion provide the standard implementation report.
