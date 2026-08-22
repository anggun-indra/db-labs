import { resolveRelationshipEndpoints, typesCompatible } from './factory'
import type { ErdProject, ErdTable, ValidationIssue } from './schema'

/**
 * ERD validation engine (spec §9).
 *
 * Pure function: ERD in -> issues out. Warnings never block work; only true
 * schema errors (severity 'error') should prevent database generation in a
 * later phase.
 */

const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

let issueCounter = 0

function issue(
  severity: ValidationIssue['severity'],
  entityType: ValidationIssue['entityType'],
  entityId: string,
  code: string,
  message: string
): ValidationIssue {
  issueCounter += 1
  return { id: `${code}-${issueCounter}`, severity, entityType, entityId, code, message }
}

function validateTableNames(tables: readonly ErdTable[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Map<string, string>()

  for (const table of tables) {
    const trimmed = table.name.trim()
    if (!trimmed) {
      issues.push(
        issue(
          'error',
          'table',
          table.id,
          'TABLE_MISSING_NAME',
          'A table must have a name before the database can be generated.'
        )
      )
      continue
    }
    const key = trimmed.toLowerCase()
    const firstId = seen.get(key)
    if (firstId) {
      issues.push(
        issue(
          'error',
          'table',
          table.id,
          'DUPLICATE_TABLE_NAME',
          `Table name "${trimmed}" is used more than once. Table names must be unique.`
        )
      )
    } else {
      seen.set(key, table.id)
    }
    if (!SQL_IDENTIFIER.test(trimmed)) {
      issues.push(
        issue(
          'warning',
          'table',
          table.id,
          'INVALID_TABLE_IDENTIFIER',
          `"${trimmed}" is not a standard SQL identifier (letters, digits, underscore; must not start with a digit). It will be wrapped in quotes in generated SQL.`
        )
      )
    }
  }
  return issues
}

function validateColumns(table: ErdTable): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (table.columns.length === 0) {
    issues.push(
      issue(
        'warning',
        'table',
        table.id,
        'EMPTY_TABLE',
        `Table "${table.name || '(unnamed)'}" has no columns yet.`
      )
    )
  }

  const seenColumns = new Map<string, boolean>()
  for (const column of table.columns) {
    const trimmed = column.name.trim()
    if (!trimmed) {
      issues.push(
        issue(
          'error',
          'column',
          column.id,
          'COLUMN_MISSING_NAME',
          `A column in "${table.name || '(unnamed table)'}" is missing a name.`
        )
      )
      continue
    }
    const key = trimmed.toLowerCase()
    if (seenColumns.has(key)) {
      issues.push(
        issue(
          'error',
          'column',
          column.id,
          'DUPLICATE_COLUMN_NAME',
          `Column "${trimmed}" appears more than once in table "${table.name}".`
        )
      )
    } else {
      seenColumns.set(key, true)
    }
    if (!SQL_IDENTIFIER.test(trimmed)) {
      issues.push(
        issue(
          'warning',
          'column',
          column.id,
          'INVALID_COLUMN_IDENTIFIER',
          `Column "${trimmed}" in "${table.name}" is not a standard SQL identifier. It will be quoted in generated SQL.`
        )
      )
    }
  }

  const primaryKeys = table.columns.filter((c) => c.primaryKey)
  if (table.columns.length > 0 && primaryKeys.length === 0) {
    issues.push(
      issue(
        'warning',
        'table',
        table.id,
        'MISSING_PRIMARY_KEY',
        `Table "${table.name}" has no primary key. Every table should have one.`
      )
    )
  } else if (primaryKeys.length > 1) {
    issues.push(
      issue(
        'info',
        'table',
        table.id,
        'COMPOSITE_PRIMARY_KEY',
        `Table "${table.name}" uses a composite primary key (${primaryKeys
          .map((c) => c.name)
          .join(', ')}).`
      )
    )
  }

  return issues
}

function validateRelationships(project: ErdProject): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seenPairs = new Map<string, boolean>()

  for (const relationship of project.relationships) {
    const endpoints = resolveRelationshipEndpoints(relationship, project.tables)

    if (!endpoints) {
      const sourceExists = project.tables.some((t) => t.id === relationship.sourceTableId)
      const targetExists = project.tables.some((t) => t.id === relationship.targetTableId)
      if (!sourceExists || !targetExists) {
        issues.push(
          issue(
            'error',
            'relationship',
            relationship.id,
            'ORPHAN_RELATIONSHIP',
            'This relationship references a table that no longer exists.'
          )
        )
      } else {
        issues.push(
          issue(
            'error',
            'relationship',
            relationship.id,
            'ORPHAN_RELATIONSHIP',
            'This relationship references a column that no longer exists.'
          )
        )
      }
      continue
    }

    const { fkTable, fkColumn, referencedTable, referencedColumn } = endpoints

    // Duplicate detection is direction-insensitive on the table/column pair.
    const pairKey = [
      [relationship.sourceTableId, relationship.sourceColumnId].join('.'),
      [relationship.targetTableId, relationship.targetColumnId].join('.')
    ]
      .sort()
      .join('<->')
    if (seenPairs.has(pairKey)) {
      issues.push(
        issue(
          'warning',
          'relationship',
          relationship.id,
          'DUPLICATE_RELATIONSHIP',
          `The relationship between "${fkTable.name}" and "${referencedTable.name}" on these columns already exists.`
        )
      )
    } else {
      seenPairs.set(pairKey, true)
    }

    if (!typesCompatible(fkColumn.type, referencedColumn.type)) {
      issues.push(
        issue(
          'warning',
          'relationship',
          relationship.id,
          'FK_TYPE_MISMATCH',
          `Foreign key ${fkTable.name}.${fkColumn.name} (${fkColumn.type}) references ${referencedTable.name}.${referencedColumn.name} (${referencedColumn.type}). The types should match.`
        )
      )
    }

    if (!referencedColumn.primaryKey && !referencedColumn.unique) {
      issues.push(
        issue(
          'info',
          'relationship',
          relationship.id,
          'FK_REFERENCES_NON_KEY',
          `${fkTable.name}.${fkColumn.name} references ${referencedTable.name}.${referencedColumn.name}, which is neither a primary key nor UNIQUE.`
        )
      )
    }
  }

  return issues
}

export function validateErd(project: ErdProject): ValidationIssue[] {
  issueCounter = 0
  const issues: ValidationIssue[] = [
    ...validateTableNames(project.tables),
    ...project.tables.flatMap(validateColumns),
    ...validateRelationships(project)
  ]

  const severityRank = { error: 0, warning: 1, info: 2 } as const
  return issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}

export function hasBlockingErrors(issues: readonly ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error')
}
