import { quoteIdentifier, quoteStringLiteral } from '@/lib/sqlite/identifier'
import type { ColumnInfo } from '@/lib/sqlite/schemaIntrospect'

/**
 * SQL builders for the visual row editor (Phase 3). Rows are addressed by
 * `rowid`, which SQLite provides for every ordinary table, so UPDATE/DELETE
 * target exactly one row even without a usable primary key.
 *
 * Every builder returns the exact SQL that will run, so the UI can show it
 * to the student ("inspect generated mutation SQL").
 */

const NUMERIC_AFFINITY = ['INTEGER', 'REAL', 'NUMERIC', 'BOOLEAN', 'DECIMAL']

/** Render a raw user string as a SQL literal for a column type. */
export function renderSqlValue(columnType: string, raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') return 'NULL'
  const upper = columnType.toUpperCase()
  const numeric = NUMERIC_AFFINITY.some((t) => upper.includes(t))
  if (numeric && /^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  if (/^(CURRENT_TIMESTAMP|CURRENT_DATE|CURRENT_TIME|NULL)$/i.test(trimmed)) {
    return trimmed.toUpperCase()
  }
  return quoteStringLiteral(raw)
}

/** Hidden column alias used to carry row identity into the UI. */
export const ROWID_ALIAS = '__rowid'

export function buildSelectRows(table: string, limit: number, offset: number): string {
  return `SELECT rowid AS ${ROWID_ALIAS}, * FROM ${quoteIdentifier(table)} LIMIT ${limit} OFFSET ${offset};`
}

export function buildInsert(table: string, columns: ColumnInfo[], values: string[]): string {
  const names = columns.map((column) => quoteIdentifier(column.name)).join(', ')
  const vals = columns
    .map((column, index) => renderSqlValue(column.type, values[index] ?? ''))
    .join(', ')
  return `INSERT INTO ${quoteIdentifier(table)} (${names}) VALUES (${vals});`
}

export function buildUpdateByRowid(
  table: string,
  columns: ColumnInfo[],
  values: string[],
  rowid: number
): string {
  const assignments = columns
    .map((column, index) => `${quoteIdentifier(column.name)} = ${renderSqlValue(column.type, values[index] ?? '')}`)
    .join(', ')
  return `UPDATE ${quoteIdentifier(table)} SET ${assignments} WHERE rowid = ${rowid};`
}

export function buildDeleteByRowid(table: string, rowid: number): string {
  return `DELETE FROM ${quoteIdentifier(table)} WHERE rowid = ${rowid};`
}
