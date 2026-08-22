// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { InvalidDatabaseFileError, SqlJsDatabaseService } from './sqlJsRuntime'
import { MemoryDatabaseByteStorage } from './dbStorage'
import { generateSqliteSchema } from './ddlGenerator'
import { createColumn, createProject, createTable } from '@/features/erd/domain/factory'

const SIMPLE_DDL = `CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
);`

function makeService(): SqlJsDatabaseService {
  return new SqlJsDatabaseService(new MemoryDatabaseByteStorage())
}

describe('SqlJsDatabaseService', () => {
  it('creates a database from DDL and queries it', async () => {
    const service = makeService()
    await service.create('p1', SIMPLE_DDL)

    expect(service.isOpen()).toBe(true)
    const result = await service.execute(
      "INSERT INTO customers (id, name, email) VALUES (1, 'Andi', 'andi@example.com');"
    )
    expect(result.kind).toBe('mutation')
    expect(result.affectedRows).toBe(1)

    const rows = await service.execute('SELECT id, name FROM customers;')
    expect(rows.kind).toBe('rows')
    expect(rows.columns).toEqual(['id', 'name'])
    expect(rows.rows).toEqual([[1, 'Andi']])
    await service.close()
  })

  it('enforces foreign keys', async () => {
    const service = makeService()
    await service.create('p1', SIMPLE_DDL)
    const result = await service.execute(
      'INSERT INTO orders (id, customer_id) VALUES (1, 999);'
    )
    expect(result.kind).toBe('error')
    expect(result.error?.code).toBe('FOREIGN_KEY_CONSTRAINT')
    expect(result.error?.hint).toBeTruthy()
    await service.close()
  })

  it('maps common errors to educational hints', async () => {
    const service = makeService()
    await service.create('p1', SIMPLE_DDL)

    const missingTable = await service.execute('SELECT * FROM ghosts;')
    expect(missingTable.error?.code).toBe('NO_SUCH_TABLE')

    const missingColumn = await service.execute('SELECT nope FROM customers;')
    expect(missingColumn.error?.code).toBe('NO_SUCH_COLUMN')

    const syntax = await service.execute('SELEC 1;')
    expect(syntax.error?.code).toBe('SYNTAX_ERROR')
    await service.close()
  })

  it('persists across close/open (byte roundtrip through storage)', async () => {
    const storage = new MemoryDatabaseByteStorage()
    const first = new SqlJsDatabaseService(storage)
    await first.create('p1', SIMPLE_DDL)
    await first.execute("INSERT INTO customers (id, name) VALUES (1, 'Andi');")
    await first.flush()
    await first.close()

    const second = new SqlJsDatabaseService(storage)
    const opened = await second.open('p1')
    expect(opened).toBe(true)
    const rows = await second.execute('SELECT COUNT(*) FROM customers;')
    expect(rows.rows).toEqual([[1]])
    await second.close()
  })

  it('open returns false when nothing is stored', async () => {
    const service = makeService()
    expect(await service.open('missing')).toBe(false)
    expect(service.isOpen()).toBe(false)
  })

  it('exports and imports databases', async () => {
    const service = makeService()
    await service.create('p1', SIMPLE_DDL)
    await service.execute("INSERT INTO customers (id, name) VALUES (1, 'Andi');")
    const bytes = await service.exportDatabase()

    await service.importDatabase('p2', bytes)
    expect(service.currentProjectId()).toBe('p2')
    const rows = await service.execute('SELECT name FROM customers;')
    expect(rows.rows).toEqual([['Andi']])
    await service.close()
  })

  it('rejects invalid database bytes', async () => {
    const service = makeService()
    await expect(service.importDatabase('p1', new Uint8Array([1, 2, 3]))).rejects.toThrow(
      InvalidDatabaseFileError
    )
  })

  it('reset removes stored bytes', async () => {
    const storage = new MemoryDatabaseByteStorage()
    const service = new SqlJsDatabaseService(storage)
    await service.create('p1', SIMPLE_DDL)
    await service.reset('p1')
    expect(service.isOpen()).toBe(false)
    expect(await storage.load('p1')).toBeNull()
  })

  it('reports DatabaseNotFoundError semantics via open()==false flow', async () => {
    const service = makeService()
    const opened = await service.open('nope')
    expect(opened).toBe(false)
    // execute without an open db is a friendly error, not a crash
    const result = await service.execute('SELECT 1;')
    expect(result.kind).toBe('error')
    expect(result.error?.raw).toContain('No database is open')
  })

  it('generates and runs DDL straight from an ERD project', async () => {
    const customers = createTable('customers', { x: 0, y: 0 }, [
      createColumn({ id: 'c1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'c2', name: 'name', type: 'TEXT', nullable: false })
    ])
    const project = { ...createProject('Gen'), tables: [customers], relationships: [] }
    const { sql } = generateSqliteSchema(project)

    const service = makeService()
    await service.create('p1', sql)
    await service.execute("INSERT INTO customers (name) VALUES ('Budi');")
    const rows = await service.execute('SELECT id, name FROM customers;')
    expect(rows.rows).toEqual([[1, 'Budi']])
    await service.close()
  })
})

describe('empty result classification', () => {
  it('treats a zero-row SELECT as rows, not mutation', async () => {
    const service = makeService()
    await service.create('p1', SIMPLE_DDL)
    const result = await service.execute('SELECT * FROM customers;')
    expect(result.kind).toBe('rows')
    expect(result.rows).toEqual([])
    await service.close()
  })

  it('keeps INSERT without rows as mutation', async () => {
    const service = makeService()
    await service.create('p1', SIMPLE_DDL)
    const result = await service.execute(
      "INSERT INTO customers (id, name) VALUES (1, 'Andi');"
    )
    expect(result.kind).toBe('mutation')
    expect(result.affectedRows).toBe(1)
    await service.close()
  })

  it('classifies by the last statement of a script', async () => {
    const service = makeService()
    await service.create('p1', SIMPLE_DDL)
    const mixed = await service.execute(
      "INSERT INTO customers (id, name) VALUES (1, 'Andi'); SELECT * FROM customers WHERE id = 999;"
    )
    expect(mixed.kind).toBe('rows')
    expect(mixed.rows).toEqual([])
    await service.close()
  })
})
