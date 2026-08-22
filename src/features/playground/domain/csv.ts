/**
 * CSV export for query results (spec §47, Phase 3 "CSV export where useful").
 * RFC 4180-style quoting.
 */
export function toCsv(columns: string[], rows: unknown[][]): string {
  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    if (/[",\r\n]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`
    }
    return text
  }

  const lines = [columns.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','))
  }
  return lines.join('\n')
}
