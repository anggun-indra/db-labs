import type { ErdProject } from '@/features/erd/domain/schema'
import { newId } from '@/features/erd/domain/factory'

/**
 * Starter ERD cloning (Phase 6). The assignment template is NEVER edited:
 * starting an assignment deep-clones the starter ERD into a brand-new
 * project with fresh table/column IDs (relationships remapped), so student
 * work can diverge freely without touching the master template.
 */

export function cloneStarterErd(starter: ErdProject, projectName: string): ErdProject {
  const tableIds = new Map<string, string>()
  const columnIds = new Map<string, string>()

  const tables = starter.tables.map((table) => {
    const newTableId = newId()
    tableIds.set(table.id, newTableId)
    const columns = table.columns.map((column) => {
      const newColumnId = newId()
      columnIds.set(column.id, newColumnId)
      return { ...column, id: newColumnId }
    })
    return { ...table, id: newTableId, columns }
  })

  const relationships = starter.relationships
    .map((relationship) => ({
      ...relationship,
      id: newId(),
      sourceTableId: tableIds.get(relationship.sourceTableId) ?? '',
      sourceColumnId: columnIds.get(relationship.sourceColumnId) ?? '',
      targetTableId: tableIds.get(relationship.targetTableId) ?? '',
      targetColumnId: columnIds.get(relationship.targetColumnId) ?? ''
    }))
    // Drop relationships whose endpoints vanished from a malformed template.
    .filter(
      (relationship) =>
        relationship.sourceTableId &&
        relationship.sourceColumnId &&
        relationship.targetTableId &&
        relationship.targetColumnId
    )

  return {
    schemaVersion: starter.schemaVersion,
    projectId: newId(),
    name: projectName,
    tables,
    relationships,
    ...(starter.viewport ? { viewport: starter.viewport } : {})
  }
}
