import { foreignKeySide } from '@/features/erd/domain/factory'
import type { ErdProject, ErdRelationship, ErdTable } from '@/features/erd/domain/schema'
import { quoteIdentifier } from './identifier'
import { renderDefaultValue, sqliteTypeDeclaration } from './typeMapping'

/**
 * Deterministic ERD -> SQLite DDL generator (spec §11, Phase 2 doc §1).
 *
 * Pure function: same ERD in -> same SQL out. Identifiers are quoted when
 * unsafe, tables are emitted in FK-dependency order, and composite primary
 * keys become table-level constraints.
 */

export interface GeneratedSchema {
  sql: string
  statements: string[]
  warnings: string[]
}

interface FkConstraint {
  fkTableId: string
  fkColumnName: string
  referencedTableName: string
  referencedColumnName: string
}

/** Stable topological sort: referenced tables first, ERD order as tie-break. */
function orderTables(project: ErdProject): { tables: ErdTable[]; reordered: boolean } {
  const relationshipsByFkTable = new Map<string, ErdRelationship[]>()
  for (const relationship of project.relationships) {
    const side = foreignKeySide(relationship)
    const fkTableId = side === 'source' ? relationship.sourceTableId : relationship.targetTableId
    const list = relationshipsByFkTable.get(fkTableId) ?? []
    list.push(relationship)
    relationshipsByFkTable.set(fkTableId, list)
  }

  const tableById = new Map(project.tables.map((t) => [t.id, t]))
  const emitted = new Set<string>()
  const ordered: ErdTable[] = []

  const emit = (table: ErdTable, visiting: Set<string>): void => {
    if (emitted.has(table.id) || visiting.has(table.id)) return
    visiting.add(table.id)
    for (const relationship of relationshipsByFkTable.get(table.id) ?? []) {
      const referencedId =
        foreignKeySide(relationship) === 'source' ? relationship.targetTableId : relationship.sourceTableId
      const referenced = tableById.get(referencedId)
      if (referenced && referenced.id !== table.id) {
        emit(referenced, visiting)
      }
    }
    visiting.delete(table.id)
    emitted.add(table.id)
    ordered.push(table)
  }

  for (const table of project.tables) emit(table, new Set())

  const reordered = ordered.some((table, index) => table.id !== project.tables[index]?.id)
  return { tables: ordered, reordered }
}

function collectFkConstraints(project: ErdProject): FkConstraint[] {
  const constraints: FkConstraint[] = []
  const seen = new Set<string>()
  const tableById = new Map(project.tables.map((t) => [t.id, t]))

  for (const relationship of project.relationships) {
    const sourceTable = tableById.get(relationship.sourceTableId)
    const targetTable = tableById.get(relationship.targetTableId)
    if (!sourceTable || !targetTable) continue

    const sourceColumn = sourceTable.columns.find((c) => c.id === relationship.sourceColumnId)
    const targetColumn = targetTable.columns.find((c) => c.id === relationship.targetColumnId)
    if (!sourceColumn || !targetColumn) continue

    const side = foreignKeySide(relationship)
    const fkTable = side === 'source' ? sourceTable : targetTable
    const fkColumn = side === 'source' ? sourceColumn : targetColumn
    const referencedTable = side === 'source' ? targetTable : sourceTable
    const referencedColumn = side === 'source' ? targetColumn : sourceColumn

    const key = `${fkTable.id}.${fkColumn.id}->${referencedTable.id}.${referencedColumn.id}`
    if (seen.has(key)) continue
    seen.add(key)

    constraints.push({
      fkTableId: fkTable.id,
      fkColumnName: fkColumn.name,
      referencedTableName: referencedTable.name,
      referencedColumnName: referencedColumn.name
    })
  }
  return constraints
}

function generateTable(
  table: ErdTable,
  fkConstraints: FkConstraint[],
  warnings: string[]
): string | null {
  const tableName = table.name.trim()
  if (table.columns.length === 0) {
    warnings.push(`Table "${tableName || '(unnamed)'}" has no columns and was skipped.`)
    return null
  }

  const primaryKeys = table.columns.filter((c) => c.primaryKey)
  const compositePk = primaryKeys.length > 1
  const lines: string[] = []

  for (const column of table.columns) {
    const parts: string[] = [quoteIdentifier(column.name.trim() || `column_${column.id}`)]
    parts.push(sqliteTypeDeclaration(column.type))

    const singleInlinePk = !compositePk && column.primaryKey
    if (singleInlinePk) parts.push('PRIMARY KEY')
    if (!column.primaryKey && !column.nullable) parts.push('NOT NULL')
    if (column.unique && !column.primaryKey) parts.push('UNIQUE')

    const renderedDefault = renderDefaultValue(column.type, column.defaultValue)
    if (renderedDefault !== null) parts.push(`DEFAULT ${renderedDefault}`)

    lines.push(parts.join(' '))
  }

  if (compositePk) {
    const pkColumns = primaryKeys.map((c) => quoteIdentifier(c.name.trim())).join(', ')
    lines.push(`PRIMARY KEY (${pkColumns})`)
  }

  for (const fk of fkConstraints.filter((c) => c.fkTableId === table.id)) {
    lines.push(
      `FOREIGN KEY (${quoteIdentifier(fk.fkColumnName)}) REFERENCES ${quoteIdentifier(
        fk.referencedTableName
      )} (${quoteIdentifier(fk.referencedColumnName)})`
    )
  }

  const body = lines.map((line) => `    ${line}`).join(',\n')
  return `CREATE TABLE ${quoteIdentifier(tableName)} (\n${body}\n);`
}

export function generateSqliteSchema(erd: ErdProject): GeneratedSchema {
  const warnings: string[] = []
  const { tables, reordered } = orderTables(erd)
  if (reordered) {
    warnings.push('Tables were reordered so referenced tables are created before their dependents.')
  }

  const fkConstraints = collectFkConstraints(erd)
  const statements: string[] = []

  for (const table of tables) {
    if (table.columns.length > 0 && !table.columns.some((c) => c.primaryKey)) {
      warnings.push(`Table "${table.name}" has no primary key.`)
    }
    const statement = generateTable(table, fkConstraints, warnings)
    if (statement !== null) statements.push(statement)
  }

  return {
    statements,
    sql: statements.join('\n\n'),
    warnings
  }
}
