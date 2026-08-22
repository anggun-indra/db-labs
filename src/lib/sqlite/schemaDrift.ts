import type { ErdProject } from '@/features/erd/domain/schema'
import type { TableInfo } from './schemaIntrospect'

/**
 * Schema drift detection (spec §42): compares the ERD against the schema
 * actually present in the SQLite database. Phase 2 keeps this conservative
 * and readable; automatic migrations are explicitly out of scope.
 */

export interface DriftReport {
  drifted: boolean
  differences: string[]
}

export function detectSchemaDrift(erd: ErdProject, dbTables: TableInfo[]): DriftReport {
  const differences: string[] = []
  const dbByName = new Map(dbTables.map((t) => [t.name.toLowerCase(), t]))
  const erdByName = new Map(
    erd.tables
      .filter((t) => t.name.trim() !== '' && t.columns.length > 0)
      .map((t) => [t.name.trim().toLowerCase(), t] as const)
  )

  for (const [lowerName, erdTable] of erdByName) {
    const dbTable = dbByName.get(lowerName)
    if (!dbTable) {
      differences.push(`Table "${erdTable.name.trim()}" exists in the ERD but not in the database.`)
      continue
    }

    const dbColumns = new Map(dbTable.columns.map((c) => [c.name.toLowerCase(), c]))
    const erdColumns = new Map(
      erdTable.columns.map((c) => [c.name.trim().toLowerCase(), c] as const)
    )

    for (const [colLower, erdColumn] of erdColumns) {
      const dbColumn = dbColumns.get(colLower)
      if (!dbColumn) {
        differences.push(`Column "${erdTable.name}.${erdColumn.name}" is missing from the database.`)
        continue
      }
      if (dbColumn.type.toUpperCase() !== erdColumn.type.toUpperCase()) {
        differences.push(
          `Column "${erdTable.name}.${erdColumn.name}" has type ${dbColumn.type} in the database but ${erdColumn.type} in the ERD.`
        )
      }
      if (dbColumn.pk !== erdColumn.primaryKey) {
        differences.push(
          `Column "${erdTable.name}.${erdColumn.name}" primary-key flag differs between ERD and database.`
        )
      }
      // Primary keys are implicitly NOT NULL in SQLite and PRAGMA table_info
      // reports 0 for INTEGER PRIMARY KEY, so skip nullability for PK columns.
      if (!erdColumn.primaryKey && !dbColumn.pk) {
        const erdNotNull = !erdColumn.nullable
        if (dbColumn.notnull !== erdNotNull) {
          differences.push(
            `Column "${erdTable.name}.${erdColumn.name}" nullability differs between ERD and database.`
          )
        }
      }
    }

    for (const dbColumn of dbTable.columns) {
      if (!erdColumns.has(dbColumn.name.toLowerCase())) {
        differences.push(`Column "${erdTable.name}.${dbColumn.name}" exists in the database but not in the ERD.`)
      }
    }
  }

  for (const dbTable of dbTables) {
    if (!erdByName.has(dbTable.name.toLowerCase())) {
      differences.push(`Table "${dbTable.name}" exists in the database but not in the ERD.`)
    }
  }

  return { drifted: differences.length > 0, differences }
}
