import { describe, expect, it } from 'vitest'
import { generateSqliteSchema } from './ddlGenerator'
import { createColumn, createProject, createTable } from '@/features/erd/domain/factory'
import type { ErdProject, ErdRelationship } from '@/features/erd/domain/schema'

function customersAndOrders(): ErdProject {
  const customers = createTable('customers', { x: 0, y: 0 }, [
    createColumn({ id: 'c-cust-pk', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
    createColumn({ id: 'c-cust-name', name: 'name', type: 'TEXT', nullable: false }),
    createColumn({ id: 'c-cust-email', name: 'email', type: 'TEXT', unique: true, nullable: true })
  ])
  const orders = createTable('orders', { x: 0, y: 0 }, [
    createColumn({ id: 'c-ord-pk', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
    createColumn({ id: 'c-ord-cust', name: 'customer_id', type: 'INTEGER', nullable: false }),
    createColumn({ id: 'c-ord-total', name: 'total', type: 'REAL', nullable: false, defaultValue: '0' })
  ])
  const relationship: ErdRelationship = {
    id: 'rel-1',
    sourceTableId: orders.id,
    sourceColumnId: 'c-ord-cust',
    targetTableId: customers.id,
    targetColumnId: 'c-cust-pk',
    cardinality: 'many-to-one'
  }
  return { ...createProject('Test'), tables: [customers, orders], relationships: [relationship] }
}

describe('generateSqliteSchema', () => {
  it('generates a simple table with PK, NOT NULL and UNIQUE', () => {
    const project = customersAndOrders()
    project.relationships = []
    const { statements } = generateSqliteSchema(project)

    expect(statements[0]).toBe(
      'CREATE TABLE customers (\n' +
        '    id INTEGER PRIMARY KEY,\n' +
        '    name TEXT NOT NULL,\n' +
        '    email TEXT UNIQUE\n' +
        ');'
    )
  })

  it('emits FK constraints on the many side', () => {
    const { sql } = generateSqliteSchema(customersAndOrders())
    expect(sql).toContain('FOREIGN KEY (customer_id) REFERENCES customers (id)')
    expect(sql.indexOf('CREATE TABLE customers')).toBeLessThan(sql.indexOf('CREATE TABLE orders'))
  })

  it('reorders tables so referenced tables come first', () => {
    const project = customersAndOrders()
    project.tables = [project.tables[1], project.tables[0]] // orders first
    const { sql, warnings } = generateSqliteSchema(project)
    expect(sql.indexOf('CREATE TABLE customers')).toBeLessThan(sql.indexOf('CREATE TABLE orders'))
    expect(warnings.some((w) => w.includes('reordered'))).toBe(true)
  })

  it('supports composite primary keys', () => {
    const junction = createTable('order_items', { x: 0, y: 0 }, [
      createColumn({ id: 'a', name: 'order_id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'b', name: 'product_id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'c', name: 'quantity', type: 'INTEGER', nullable: false, defaultValue: '1' })
    ])
    const project = { ...createProject('Composite'), tables: [junction], relationships: [] }
    const { statements } = generateSqliteSchema(project)
    expect(statements[0]).toContain('PRIMARY KEY (order_id, product_id)')
    expect(statements[0]).not.toContain('order_id INTEGER PRIMARY KEY')
  })

  it('renders defaults and nullability', () => {
    const table = createTable('settings', { x: 0, y: 0 }, [
      createColumn({ id: 'a', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'b', name: 'theme', type: 'TEXT', nullable: false, defaultValue: 'dark' }),
      createColumn({ id: 'c', name: 'note', type: 'TEXT', nullable: true })
    ])
    const project = { ...createProject('Defaults'), tables: [table], relationships: [] }
    const { statements } = generateSqliteSchema(project)
    expect(statements[0]).toContain("theme TEXT NOT NULL DEFAULT 'dark'")
    expect(statements[0]).toContain('note TEXT')
    expect(statements[0]).not.toContain('note TEXT NOT NULL')
  })

  it('quotes unsafe identifiers', () => {
    const table = createTable('weird-table', { x: 0, y: 0 }, [
      createColumn({ id: 'a', name: '1st col', type: 'TEXT', primaryKey: true, nullable: false })
    ])
    const project = { ...createProject('Quoted'), tables: [table], relationships: [] }
    const { statements } = generateSqliteSchema(project)
    expect(statements[0]).toContain('CREATE TABLE "weird-table"')
    expect(statements[0]).toContain('"1st col" TEXT PRIMARY KEY')
  })

  it('is deterministic', () => {
    const project = customersAndOrders()
    const first = generateSqliteSchema(project)
    const second = generateSqliteSchema(project)
    expect(first.sql).toBe(second.sql)
    expect(first.statements).toEqual(second.statements)
  })

  it('skips empty tables and warns', () => {
    const project = customersAndOrders()
    project.tables.push(createTable('ghost', { x: 0, y: 0 }, []))
    const { statements, warnings } = generateSqliteSchema(project)
    expect(statements.some((s) => s.includes('ghost'))).toBe(false)
    expect(warnings.some((w) => w.includes('ghost'))).toBe(true)
  })

  it('warns about tables without primary keys', () => {
    const table = createTable('logs', { x: 0, y: 0 }, [
      createColumn({ id: 'a', name: 'message', type: 'TEXT' })
    ])
    const project = { ...createProject('NoPk'), tables: [table], relationships: [] }
    const { warnings } = generateSqliteSchema(project)
    expect(warnings.some((w) => w.includes('no primary key'))).toBe(true)
  })

  it('ignores orphan relationships gracefully', () => {
    const project = customersAndOrders()
    project.relationships[0] = { ...project.relationships[0], targetTableId: 'missing' }
    const { sql } = generateSqliteSchema(project)
    expect(sql).not.toContain('FOREIGN KEY')
  })
})
