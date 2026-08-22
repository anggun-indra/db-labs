/**
 * SQL execution selection rules (Phase 3): run the selection when there is
 * one, otherwise run the whole editor content.
 */
export function pickExecutableSql(fullText: string, selection: string | null | undefined): string {
  const candidate = selection && selection.trim().length > 0 ? selection : fullText
  return candidate.trim()
}

/** Display cap for result rendering (spec §47 default 500). */
export const RESULT_RENDER_CAP = 500

export interface CappedRows {
  displayRows: unknown[][]
  totalRows: number
  capped: boolean
}

/**
 * Cap rendered rows without silently modifying the SQL (spec §47): the query
 * still runs fully; only the displayed table is limited.
 */
export function capRows(rows: unknown[][], cap: number = RESULT_RENDER_CAP): CappedRows {
  if (rows.length <= cap) return { displayRows: rows, totalRows: rows.length, capped: false }
  return { displayRows: rows.slice(0, cap), totalRows: rows.length, capped: true }
}
