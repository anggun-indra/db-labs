import {
  ERD_SCHEMA_VERSION,
  type Cardinality,
  type ColumnType,
  type ErdColumn,
  type ErdProject,
  type ErdRelationship,
  type ErdTable,
  type Position
} from './schema'

/**
 * Factories for ERD domain objects.
 * IDs use crypto.randomUUID with a fallback for older browsers/tests.
 */

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createColumn(partial: Partial<ErdColumn> = {}): ErdColumn {
  return {
    name: '',
    type: 'TEXT',
    primaryKey: false,
    nullable: true,
    unique: false,
    ...partial,
    id: partial.id ?? newId()
  }
}

export function createPrimaryKeyColumn(name = 'id'): ErdColumn {
  return createColumn({ name, type: 'INTEGER', primaryKey: true, nullable: false })
}

export function createTable(name: string, position: Position, columns?: ErdColumn[]): ErdTable {
  return {
    id: newId(),
    name,
    position,
    columns: columns ?? [createPrimaryKeyColumn()]
  }
}

export function createProject(name: string): ErdProject {
  return {
    schemaVersion: ERD_SCHEMA_VERSION,
    projectId: newId(),
    name,
    tables: [],
    relationships: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  }
}

/** Deep-copy a table with fresh IDs and a suffixed name (spec §7: duplicate table). */
export function duplicateTable(table: ErdTable, offset = 40): ErdTable {
  return {
    id: newId(),
    name: `${table.name || 'table'}_copy`,
    position: { x: table.position.x + offset, y: table.position.y + offset },
    columns: table.columns.map((column) => ({ ...column, id: newId() }))
  }
}

/** Which side of a relationship holds the foreign key (see schema.ts). */
export function foreignKeySide(relationship: ErdRelationship): 'source' | 'target' {
  return relationship.cardinality === 'one-to-many' ? 'target' : 'source'
}

export function cardinalityLabel(cardinality: Cardinality): string {
  switch (cardinality) {
    case 'one-to-one':
      return '1:1'
    case 'one-to-many':
      return '1:N'
    case 'many-to-one':
      return 'N:1'
  }
}

/**
 * Resolve the FK and referenced endpoints of a relationship.
 * Returns null when either endpoint is missing (orphan relationship).
 */
export function resolveRelationshipEndpoints(
  relationship: ErdRelationship,
  tables: readonly ErdTable[]
): {
  fkTable: ErdTable
  fkColumn: ErdColumn
  referencedTable: ErdTable
  referencedColumn: ErdColumn
} | null {
  const sourceTable = tables.find((t) => t.id === relationship.sourceTableId)
  const targetTable = tables.find((t) => t.id === relationship.targetTableId)
  if (!sourceTable || !targetTable) return null

  const sourceColumn = sourceTable.columns.find((c) => c.id === relationship.sourceColumnId)
  const targetColumn = targetTable.columns.find((c) => c.id === relationship.targetColumnId)
  if (!sourceColumn || !targetColumn) return null

  return foreignKeySide(relationship) === 'source'
    ? {
        fkTable: sourceTable,
        fkColumn: sourceColumn,
        referencedTable: targetTable,
        referencedColumn: targetColumn
      }
    : {
        fkTable: targetTable,
        fkColumn: targetColumn,
        referencedTable: sourceTable,
        referencedColumn: sourceColumn
      }
}

/** Compatibility check between an FK column type and the referenced type. */
export function typesCompatible(a: ColumnType, b: ColumnType): boolean {
  if (a === b) return true
  // INTEGER is the natural key type; allow INTEGER <-> NUMERIC/BOOLEAN matches
  // so common teaching schemas do not produce noisy warnings.
  const numericLike: readonly ColumnType[] = ['INTEGER', 'NUMERIC', 'BOOLEAN']
  if (numericLike.includes(a) && numericLike.includes(b)) return true
  return false
}
