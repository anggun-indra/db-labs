import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { QueryExecutionResult } from './queryResult'
import { explainSqliteError } from './errorHints'
import { createDatabaseByteStorage, type DatabaseByteStorage } from './dbStorage'
import { introspectSchema, type TableInfo } from './schemaIntrospect'

/**
 * Browser-local SQLite runtime (spec §3, §12; Phase 2 doc §5-6).
 *
 * Implementation notes (see docs/decisions/0006 for the engine choice):
 * - sql.js (SQLite compiled to WASM) runs fully in the page/worker context.
 * - Persistence is handled by DatabaseByteStorage (OPFS primary, IndexedDB
 *   fallback): after mutations the exported bytes are written back with a
 *   short debounce, so a refresh restores the exact same database.
 * - Raw sql.js objects never leak into React components (spec §12).
 */

export class DatabaseNotFoundError extends Error {
  constructor(projectId: string) {
    super(`No local SQLite database found for project ${projectId}`)
    this.name = 'DatabaseNotFoundError'
  }
}

export class InvalidDatabaseFileError extends Error {
  constructor() {
    super('The file is not a valid SQLite database (header check failed).')
    this.name = 'InvalidDatabaseFileError'
  }
}

/**
 * True when the last statement in a script is one that produces rows even
 * when it matches nothing (SELECT/PRAGMA/WITH/VALUES/EXPLAIN). Used to
 * classify sql.js empty results, which carry no statement-type information.
 */
export function lastStatementIsQuery(sql: string): boolean {
  const statements = sql
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = statements[statements.length - 1] ?? ''
  return /^(SELECT|PRAGMA|WITH|VALUES|EXPLAIN)\b/i.test(last)
}

export interface SqliteDatabaseService {
  create(projectId: string, ddl: string): Promise<void>
  /** Returns false when no stored database exists for the project. */
  open(projectId: string): Promise<boolean>
  execute(sql: string): Promise<QueryExecutionResult>
  exportDatabase(): Promise<Uint8Array>
  importDatabase(projectId: string, bytes: Uint8Array): Promise<void>
  close(): Promise<void>
  reset(projectId: string): Promise<void>
  isOpen(): boolean
  currentProjectId(): string | null
  storageKind(): string
  /** Read-only schema introspection; returns DTOs, never the raw handle. */
  introspect(): TableInfo[]
  /** Force any pending debounced persistence to complete. */
  flush(): Promise<void>
}

const PERSIST_DEBOUNCE_MS = 300
const SQLITE_HEADER = 'SQLite format 3\u0000'

let sqlJsPromise: Promise<SqlJsStatic> | null = null

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    // Browser: serve the wasm through Vite's asset pipeline.
    // Node (tests): sql.js resolves the wasm from its own package.
    sqlJsPromise =
      typeof window !== 'undefined' ? initSqlJs({ locateFile: () => sqlWasmUrl }) : initSqlJs()
  }
  return sqlJsPromise
}

function looksLikeSqlite(bytes: Uint8Array): boolean {
  if (bytes.length < 100) return false
  let header = ''
  for (let i = 0; i < SQLITE_HEADER.length; i++) header += String.fromCharCode(bytes[i])
  return header === SQLITE_HEADER
}

export class SqlJsDatabaseService implements SqliteDatabaseService {
  private db: Database | null = null
  private projectId: string | null = null
  private persistTimer: ReturnType<typeof setTimeout> | undefined
  private pendingPersist = false

  constructor(private readonly storage: DatabaseByteStorage = createDatabaseByteStorage()) {}

  storageKind(): string {
    return this.storage.kind
  }

  introspect(): TableInfo[] {
    if (!this.db) return []
    return introspectSchema(this.db)
  }

  isOpen(): boolean {
    return this.db !== null
  }

  currentProjectId(): string | null {
    return this.projectId
  }

  async create(projectId: string, ddl: string): Promise<void> {
    const SQL = await getSqlJs()
    await this.closeInternal()

    const db = new SQL.Database()
    db.run('PRAGMA foreign_keys = ON;')
    try {
      if (ddl.trim().length > 0) db.exec(ddl)
    } catch (error) {
      db.close()
      throw error
    }

    this.db = db
    this.projectId = projectId
    await this.persistNow()
  }

  async open(projectId: string): Promise<boolean> {
    const bytes = await this.storage.load(projectId)
    if (!bytes) return false

    const SQL = await getSqlJs()
    await this.closeInternal()

    const db = new SQL.Database(bytes)
    db.run('PRAGMA foreign_keys = ON;')
    this.db = db
    this.projectId = projectId
    return true
  }

  async execute(sql: string): Promise<QueryExecutionResult> {
    if (!this.db) {
      return {
        kind: 'error',
        executionTimeMs: 0,
        error: {
          raw: 'No database is open. Create or open a database first.',
          code: 'NO_DATABASE_OPEN',
          hint: 'Generate a SQLite database from your ERD on the Database page first, then practice SQL here.'
        }
      }
    }

    const start = performance.now()
    try {
      const results = this.db.exec(sql)
      const executionTimeMs = performance.now() - start
      const affectedRows = this.db.getRowsModified()

      if (results.length > 0) {
        const last = results[results.length - 1]
        // INSERT/UPDATE/DELETE ... RETURNING produces rows AND modifications.
        if (affectedRows > 0) this.schedulePersist()
        return {
          kind: 'rows',
          columns: last.columns,
          rows: last.values as unknown[][],
          affectedRows,
          executionTimeMs
        }
      }

      this.schedulePersist()
      // sql.js `exec` returns [] for zero-row queries; classify by the last
      // statement's shape so an empty SELECT is still a result set.
      if (lastStatementIsQuery(sql)) {
        return { kind: 'rows', columns: [], rows: [], affectedRows: 0, executionTimeMs }
      }
      return { kind: 'mutation', affectedRows, executionTimeMs }
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error)
      const explanation = explainSqliteError(raw)
      return {
        kind: 'error',
        executionTimeMs: performance.now() - start,
        error: {
          raw,
          code: explanation?.code ?? 'SQLITE_ERROR',
          hint:
            explanation?.hint ??
            'Check your SQL syntax, table structure in the Schema panel, and column data types.'
        }
      }
    }
  }

  async exportDatabase(): Promise<Uint8Array> {
    if (!this.db) throw new Error('No database is open.')
    await this.flush()
    return this.exportBytes()
  }

  async importDatabase(projectId: string, bytes: Uint8Array): Promise<void> {
    if (!looksLikeSqlite(bytes)) throw new InvalidDatabaseFileError()

    const SQL = await getSqlJs()
    await this.closeInternal()

    const db = new SQL.Database(bytes)
    db.run('PRAGMA foreign_keys = ON;')
    this.db = db
    this.projectId = projectId
    await this.persistNow()
  }

  async close(): Promise<void> {
    await this.closeInternal()
  }

  async reset(projectId: string): Promise<void> {
    if (this.projectId === projectId) {
      await this.closeInternal()
    }
    await this.storage.delete(projectId)
  }

  async flush(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = undefined
    }
    if (!this.pendingPersist) return
    await this.persistNow()
  }

  private schedulePersist(): void {
    this.pendingPersist = true
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined
      void this.persistNow().catch((error) => console.error('SQLite persist failed:', error))
    }, PERSIST_DEBOUNCE_MS)
  }

  private async persistNow(): Promise<void> {
    this.pendingPersist = false
    if (!this.db || !this.projectId) return
    await this.storage.save(this.projectId, this.exportBytes())
  }

  /**
   * sql.js `export()` closes and reopens the connection internally, which
   * resets connection state such as `PRAGMA foreign_keys`. Re-apply it after
   * every export so enforcement stays on.
   */
  private exportBytes(): Uint8Array {
    if (!this.db) throw new Error('No database is open.')
    const bytes = this.db.export()
    this.db.run('PRAGMA foreign_keys = ON;')
    return bytes
  }

  private async closeInternal(): Promise<void> {
    await this.flush()
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.projectId = null
  }
}

/** App-wide singleton; tests construct isolated instances. */
export const sqliteService: SqliteDatabaseService = new SqlJsDatabaseService()
