/**
 * Per-project SQL editor draft (Phase 3: "preserve draft per project
 * locally"). Plain localStorage; debouncing happens in the store.
 */

const keyFor = (projectId: string) => `dblab:sql-draft:${projectId}`

export function loadDraft(projectId: string): string {
  return localStorage.getItem(keyFor(projectId)) ?? ''
}

export function saveDraft(projectId: string, sql: string): void {
  localStorage.setItem(keyFor(projectId), sql)
}
