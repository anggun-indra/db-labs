/**
 * Local SQL history per project (Phase 3). Newest first, capped.
 * Stored in localStorage so history survives reloads (local-first).
 */

export interface QueryHistoryEntry {
  id: string
  sql: string
  ok: boolean
  executionTimeMs: number
  timestamp: number
}

export const HISTORY_CAP = 100

const keyFor = (projectId: string) => `dblab:sql-history:${projectId}`

function safeParse(raw: string | null): QueryHistoryEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is QueryHistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as QueryHistoryEntry).id === 'string' &&
        typeof (entry as QueryHistoryEntry).sql === 'string'
    )
  } catch {
    return []
  }
}

export function loadHistory(projectId: string): QueryHistoryEntry[] {
  return safeParse(localStorage.getItem(keyFor(projectId)))
}

export function saveHistory(projectId: string, entries: QueryHistoryEntry[]): void {
  localStorage.setItem(keyFor(projectId), JSON.stringify(entries.slice(0, HISTORY_CAP)))
}

export function appendHistory(
  projectId: string,
  entry: Omit<QueryHistoryEntry, 'id' | 'timestamp'>,
  now: number = Date.now()
): QueryHistoryEntry[] {
  const entries = [
    {
      ...entry,
      id: `h-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now
    },
    ...loadHistory(projectId)
  ].slice(0, HISTORY_CAP)
  saveHistory(projectId, entries)
  return entries
}

export function clearHistory(projectId: string): void {
  localStorage.removeItem(keyFor(projectId))
}
