import type { Database } from 'sql.js'
import { quoteIdentifier } from './identifier'

/**
 * Read-only schema introspection used by the Schema Explorer (spec §16) and
 * drift detection (spec §42).
 */

export interface ColumnInfo {
  name: string
  type: string
  notnull: boolean
  pk: boolean
  defaultValue: string | null
}

export interface ForeignKeyInfo {
  fromColumn: string
  toTable: string
  toColumn: string
}

export interface IndexInfo {
  name: string
  unique: boolean
  columns: string[]
}

export interface TableInfo {
  name: string
  createSql: string | null
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
  indexes: IndexInfo[]
  rowCount: number
}

function exec(db: Database, sql: string): { columns: string[]; values: unknown[][] }[] {
  try {
    return db.exec(sql)
  } catch {
    return []
  }
}

function first(db: Database, sql: string): unknown[][] {
  const results = exec(db, sql)
  return results.length > 0 ? results[0].values : []
}

export function introspectSchema(db: Database): TableInfo[] {
  const tableRows = first(
    db,
    `SELECT name, sql FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  )

  return tableRows.map((row) => {
    const name = String(row[0])
    const createSql = row[1] === null ? null : String(row[1])
    const quoted = quoteIdentifier(name)

    const columnRows = first(db, `PRAGMA table_info(${quoted})`)
    const columns: ColumnInfo[] = columnRows.map((c) => ({
      name: String(c[1]),
      type: String(c[2]),
      notnull: Number(c[3]) === 1,
      defaultValue: c[4] === null ? null : String(c[4]),
      pk: Number(c[5]) > 0
    }))

    const fkRows = first(db, `PRAGMA foreign_key_list(${quoted})`)
    const foreignKeys: ForeignKeyInfo[] = fkRows.map((f) => ({
      toTable: String(f[2]),
      fromColumn: String(f[3]),
      toColumn: f[4] === null ? '' : String(f[4])
    }))

    const indexRows = first(db, `PRAGMA index_list(${quoted})`)
    const indexes: IndexInfo[] = indexRows.map((i) => {
      const indexName = String(i[1])
      const columnRows = first(db, `PRAGMA index_info(${quoteIdentifier(indexName)})`)
      return {
        name: indexName,
        unique: Number(i[2]) === 1,
        columns: columnRows.map((c) => String(c[2]))
      }
    })

    const countRows = first(db, `SELECT COUNT(*) FROM ${quoted}`)
    const rowCount = countRows.length > 0 ? Number(countRows[0][0]) : 0

    return { name, createSql, columns, foreignKeys, indexes, rowCount }
  })
}
