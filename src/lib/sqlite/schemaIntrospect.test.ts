// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'
import { introspectSchema } from './schemaIntrospect'
import { detectSchemaDrift } from './schemaDrift'
import { createColumn, createProject, createTable } from '@/features/erd/domain/factory'

const DDL = `CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id)
);
INSERT INTO customers (id, name, email) VALUES (1, 'Andi', 'andi@example.com');
INSERT INTO customers (id, name, email) VALUES (2, 'Budi', 'budi@example.com');`

let db: Database

beforeAll(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database()
  db.exec(DDL)
})

describe('introspectSchema', () => {
  it('lists tables with columns, PK and nullability', () => {
    const tables = introspectSchema(db)
    const names = tables.map((t) => t.name)
    expect(names).toEqual(['customers', 'orders'])

    const customers = tables.find((t) => t.name === 'customers')!
    expect(customers.columns).toEqual([
      { name: 'id', type: 'INTEGER', notnull: false, pk: true, defaultValue: null },
      { name: 'name', type: 'TEXT', notnull: true, pk: false, defaultValue: null },
      { name: 'email', type: 'TEXT', notnull: false, pk: false, defaultValue: null }
    ])
    expect(customers.rowCount).toBe(2)
    expect(customers.createSql).toContain('CREATE TABLE customers')
  })

  it('reports foreign keys and indexes', () => {
    const tables = introspectSchema(db)
    const orders = tables.find((t) => t.name === 'orders')!
    expect(orders.foreignKeys).toEqual([
      { fromColumn: 'customer_id', toTable: 'customers', toColumn: 'id' }
    ])

    const customers = tables.find((t) => t.name === 'customers')!
    const uniqueIndex = customers.indexes.find((i) => i.unique)
    expect(uniqueIndex?.columns).toEqual(['email'])
  })
})

describe('detectSchemaDrift', () => {
  it('reports no drift for a matching ERD', () => {
    const customers = createTable('customers', { x: 0, y: 0 }, [
      createColumn({ id: 'c1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'c2', name: 'name', type: 'TEXT', nullable: false }),
      createColumn({ id: 'c3', name: 'email', type: 'TEXT', nullable: true })
    ])
    const orders = createTable('orders', { x: 0, y: 0 }, [
      createColumn({ id: 'o1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'o2', name: 'customer_id', type: 'INTEGER', nullable: false })
    ])
    const project = { ...createProject('Match'), tables: [customers, orders], relationships: [] }
    const report = detectSchemaDrift(project, introspectSchema(db))
    expect(report.drifted).toBe(false)
    expect(report.differences).toEqual([])
  })

  it('detects missing and extra tables', () => {
    const customers = createTable('customers', { x: 0, y: 0 }, [
      createColumn({ id: 'c1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false })
    ])
    const products = createTable('products', { x: 0, y: 0 }, [
      createColumn({ id: 'p1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false })
    ])
    const project = { ...createProject('Drift'), tables: [customers, products], relationships: [] }
    const report = detectSchemaDrift(project, introspectSchema(db))
    expect(report.drifted).toBe(true)
    expect(report.differences.some((d) => d.includes('products'))).toBe(true)
    expect(report.differences.some((d) => d.includes('orders') && d.includes('not in the ERD'))).toBe(
      true
    )
  })

  it('detects column-level drift', () => {
    const customers = createTable('customers', { x: 0, y: 0 }, [
      createColumn({ id: 'c1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'c2', name: 'name', type: 'TEXT', nullable: false }),
      createColumn({ id: 'c3', name: 'phone', type: 'TEXT', nullable: true })
    ])
    const orders = createTable('orders', { x: 0, y: 0 }, [
      createColumn({ id: 'o1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'o2', name: 'customer_id', type: 'INTEGER', nullable: false })
    ])
    const project = { ...createProject('ColDrift'), tables: [customers, orders], relationships: [] }
    const report = detectSchemaDrift(project, introspectSchema(db))
    expect(report.drifted).toBe(true)
    expect(report.differences.some((d) => d.includes('phone') && d.includes('missing'))).toBe(true)
    expect(report.differences.some((d) => d.includes('email') && d.includes('not in the ERD'))).toBe(
      true
    )
  })
})
