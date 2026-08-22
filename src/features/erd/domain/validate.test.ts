import { describe, expect, it } from 'vitest'
import { hasBlockingErrors, validateErd } from './validate'
import { createColumn, createProject, createTable } from './factory'
import type { ErdProject, ErdRelationship, ErdTable } from './schema'

function tableWith(overrides: Partial<ErdTable>): ErdTable {
  return { ...createTable('orders', { x: 0, y: 0 }), ...overrides }
}

function relationship(overrides: Partial<ErdRelationship>): ErdRelationship {
  return {
    id: 'rel-1',
    sourceTableId: 't-orders',
    sourceColumnId: 'c-customer-id',
    targetTableId: 't-customers',
    targetColumnId: 'c-customer-pk',
    cardinality: 'many-to-one',
    ...overrides
  }
}

function validProject(): ErdProject {
  const customers = tableWith({
    id: 't-customers',
    name: 'customers',
    columns: [
      createColumn({
        id: 'c-customer-pk',
        name: 'id',
        type: 'INTEGER',
        primaryKey: true,
        nullable: false
      })
    ]
  })
  const orders = tableWith({
    id: 't-orders',
    name: 'orders',
    columns: [
      createColumn({
        id: 'c-order-pk',
        name: 'id',
        type: 'INTEGER',
        primaryKey: true,
        nullable: false
      }),
      createColumn({ id: 'c-customer-id', name: 'customer_id', type: 'INTEGER', nullable: false })
    ]
  })
  return {
    ...createProject('Valid'),
    tables: [customers, orders],
    relationships: [relationship({})]
  }
}

describe('validateErd', () => {
  it('returns no issues for a valid ERD', () => {
    const issues = validateErd(validProject())
    expect(issues).toEqual([])
    expect(hasBlockingErrors(issues)).toBe(false)
  })

  it('reports an error for a table without a name', () => {
    const project = validProject()
    project.tables.push(tableWith({ id: 't-x', name: '   ' }))
    const issues = validateErd(project)
    expect(issues.some((i) => i.code === 'TABLE_MISSING_NAME' && i.severity === 'error')).toBe(true)
  })

  it('reports duplicate table names case-insensitively', () => {
    const project = validProject()
    project.tables.push(tableWith({ id: 't-dup', name: 'Customers' }))
    const issues = validateErd(project)
    expect(issues.some((i) => i.code === 'DUPLICATE_TABLE_NAME' && i.entityId === 't-dup')).toBe(
      true
    )
  })

  it('reports duplicate column names within a table', () => {
    const project = validProject()
    const orders = project.tables.find((t) => t.id === 't-orders')!
    orders.columns.push(createColumn({ id: 'c-dup', name: 'ID' }))
    const issues = validateErd(project)
    expect(issues.some((i) => i.code === 'DUPLICATE_COLUMN_NAME' && i.entityId === 'c-dup')).toBe(
      true
    )
  })

  it('warns when a table has no primary key', () => {
    const project = validProject()
    const customers = project.tables.find((t) => t.id === 't-customers')!
    customers.columns[0] = { ...customers.columns[0], primaryKey: false }
    // remove relationship so FK_REFERENCES_NON_KEY does not interfere
    project.relationships = []
    const issues = validateErd(project)
    expect(
      issues.some(
        (i) =>
          i.code === 'MISSING_PRIMARY_KEY' &&
          i.severity === 'warning' &&
          i.entityId === 't-customers'
      )
    ).toBe(true)
  })

  it('reports multiple primary keys as a composite key info', () => {
    const project = validProject()
    const orders = project.tables.find((t) => t.id === 't-orders')!
    orders.columns[1] = { ...orders.columns[1], primaryKey: true, nullable: false }
    const issues = validateErd(project)
    expect(issues.some((i) => i.code === 'COMPOSITE_PRIMARY_KEY' && i.severity === 'info')).toBe(
      true
    )
  })

  it('warns on empty tables', () => {
    const project = validProject()
    project.tables.push(tableWith({ id: 't-empty', name: 'empty_table', columns: [] }))
    const issues = validateErd(project)
    expect(issues.some((i) => i.code === 'EMPTY_TABLE' && i.entityId === 't-empty')).toBe(true)
  })

  it('warns on invalid SQL identifiers', () => {
    const project = validProject()
    project.tables.push(
      tableWith({
        id: 't-bad',
        name: '1bad-name',
        columns: [createColumn({ id: 'c-badpk', name: 'pk', primaryKey: true, nullable: false })]
      })
    )
    const issues = validateErd(project)
    expect(
      issues.some((i) => i.code === 'INVALID_TABLE_IDENTIFIER' && i.entityId === 't-bad')
    ).toBe(true)
  })

  it('reports an error when a relationship references a missing table', () => {
    const project = validProject()
    project.relationships = [relationship({ targetTableId: 't-ghost' })]
    const issues = validateErd(project)
    const orphan = issues.find((i) => i.code === 'ORPHAN_RELATIONSHIP')
    expect(orphan).toBeDefined()
    expect(orphan?.severity).toBe('error')
    expect(orphan?.message).toContain('table')
  })

  it('reports an error when a relationship references a missing column', () => {
    const project = validProject()
    project.relationships = [relationship({ targetColumnId: 'c-ghost' })]
    const issues = validateErd(project)
    const orphan = issues.find((i) => i.code === 'ORPHAN_RELATIONSHIP')
    expect(orphan).toBeDefined()
    expect(orphan?.message).toContain('column')
  })

  it('warns when FK and referenced column types are incompatible', () => {
    const project = validProject()
    const orders = project.tables.find((t) => t.id === 't-orders')!
    orders.columns[1] = { ...orders.columns[1], type: 'TEXT' }
    const issues = validateErd(project)
    expect(issues.some((i) => i.code === 'FK_TYPE_MISMATCH' && i.severity === 'warning')).toBe(true)
  })

  it('warns on duplicate relationships', () => {
    const project = validProject()
    project.relationships = [
      relationship({}),
      relationship({ id: 'rel-2', cardinality: 'many-to-one' })
    ]
    const issues = validateErd(project)
    expect(issues.some((i) => i.code === 'DUPLICATE_RELATIONSHIP' && i.entityId === 'rel-2')).toBe(
      true
    )
  })

  it('detects the FK side for one-to-many relationships (FK on target)', () => {
    // Flip the valid scenario: one-to-many means FK lives on the target side.
    const project = validProject()
    // FK column now lives in customers (target); customers.customer_ref -> orders.id
    const customers = project.tables.find((t) => t.id === 't-customers')!
    customers.columns.push(
      createColumn({ id: 'c-order-ref', name: 'order_ref', type: 'INTEGER', nullable: false })
    )
    project.relationships = [
      relationship({
        cardinality: 'one-to-many',
        sourceColumnId: 'c-order-pk',
        targetColumnId: 'c-order-ref'
      })
    ]
    expect(validateErd(project)).toEqual([])
  })

  it('sorts errors before warnings before info', () => {
    const project = createProject('Messy')
    project.tables = [tableWith({ id: 't-a', name: '', columns: [] })]
    const issues = validateErd(project)
    const ranks = issues.map((i) => i.severity)
    const order = ['error', 'warning', 'info']
    let last = -1
    for (const severity of ranks) {
      const rank = order.indexOf(severity)
      expect(rank).toBeGreaterThanOrEqual(last)
      last = rank
    }
  })
})
