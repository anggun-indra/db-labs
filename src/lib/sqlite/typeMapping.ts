import type { ColumnType } from '@/features/erd/domain/schema'
import { quoteStringLiteral } from './identifier'

/**
 * Teaching-type -> SQLite mapping.
 *
 * SQLite derives column affinity from the declared type name, so we can keep
 * the teaching type names as declarations and still get correct affinities:
 * - INTEGER            -> INTEGER affinity
 * - REAL               -> REAL affinity
 * - TEXT               -> TEXT affinity
 * - BLOB               -> BLOB affinity (NONE)
 * - NUMERIC family     -> NUMERIC affinity (NUMERIC, BOOLEAN, DATE, DATETIME)
 *
 * BOOLEAN stores 0/1; DATE/DATETIME are stored as ISO text or numbers, which
 * NUMERIC affinity tolerates. The UI explains this mapping (spec §7).
 */
export function sqliteTypeDeclaration(type: ColumnType): string {
  return type
}

const NUMERIC_LIKE: readonly ColumnType[] = ['INTEGER', 'REAL', 'NUMERIC', 'BOOLEAN']

/** Bare SQL keywords allowed unquoted as DEFAULT values. */
const KEYWORD_DEFAULTS = new Set(['CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'NULL'])

/**
 * Render a DEFAULT clause value.
 *
 * - empty/whitespace -> no default
 * - already-quoted expression ('...' or "...") -> used as-is
 * - numeric literal for numeric-like types -> as-is
 * - anything else -> treated as a string literal and quoted
 */
export function renderDefaultValue(type: ColumnType, defaultValue: string | undefined): string | null {
  if (defaultValue === undefined) return null
  const trimmed = defaultValue.trim()
  if (trimmed === '') return null
  if (/^(['"]).*\1$/s.test(trimmed)) return trimmed
  if (KEYWORD_DEFAULTS.has(trimmed.toUpperCase())) return trimmed.toUpperCase()
  if (NUMERIC_LIKE.includes(type) && /^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  if (type === 'DATE' || type === 'DATETIME') {
    // Common SQL functions and numeric timestamps stay raw.
    if (/^[A-Za-z_]+\s*\(/.test(trimmed) || /^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
    return quoteStringLiteral(trimmed)
  }
  return quoteStringLiteral(trimmed)
}
