/**
 * Query execution result contract (Phase 2 runtime, Phase 3 playground).
 * Shape follows phase-3-sql-playground.md exactly.
 */

export interface QueryError {
  raw: string
  code?: string
  hint?: string
}

export interface QueryExecutionResult {
  kind: 'rows' | 'mutation' | 'error'
  columns?: string[]
  rows?: unknown[][]
  affectedRows?: number
  executionTimeMs: number
  error?: QueryError
}
