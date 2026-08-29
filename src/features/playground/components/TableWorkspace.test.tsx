import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TableWorkspace } from './TableWorkspace'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'

vi.mock('@/lib/sqlite/sqlJsRuntime', () => ({
  sqliteService: {
    execute: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('orders')) {
        return Promise.resolve({
          kind: 'rows',
          columns: ['__rowid', 'id', 'total'],
          rows: [[1, 101, 250]],
          affectedRows: 0,
          executionTimeMs: 0.4
        })
      }
      return Promise.resolve({
        kind: 'rows',
        columns: ['__rowid', 'id', 'username'],
        rows: [[1, 1, 'alice']],
        affectedRows: 0,
        executionTimeMs: 0.5
      })
    }),
    flush: vi.fn()
  }
}))

const mockSchema: TableInfo[] = [
  {
    name: 'users',
    createSql: 'CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);',
    columns: [
      { name: 'id', type: 'INTEGER', notnull: true, pk: true, defaultValue: null },
      { name: 'username', type: 'TEXT', notnull: true, pk: false, defaultValue: null }
    ],
    foreignKeys: [],
    indexes: [],
    rowCount: 5
  },
  {
    name: 'orders',
    createSql: 'CREATE TABLE orders (id INTEGER PRIMARY KEY, total REAL);',
    columns: [
      { name: 'id', type: 'INTEGER', notnull: true, pk: true, defaultValue: null },
      { name: 'total', type: 'REAL', notnull: false, pk: false, defaultValue: null }
    ],
    foreignKeys: [],
    indexes: [],
    rowCount: 10
  }
]

describe('TableWorkspace', () => {
  it('renders table workspace with active table info', () => {
    render(<TableWorkspace schema={mockSchema} selectedTable="users" onSelectTable={vi.fn()} />)

    expect(screen.getByText('Active Table:')).toBeInTheDocument()
    expect(screen.getByText('2 column(s)')).toBeInTheDocument()
    expect(screen.getByText(/Data Grid & Editor/)).toBeInTheDocument()
    expect(screen.getByText(/Columns & Structure/)).toBeInTheDocument()
    expect(screen.getByText(/Foreign Keys & Indexes/)).toBeInTheDocument()
    expect(screen.getByText(/DDL Definition/)).toBeInTheDocument()
  })

  it('switches to structure tab and displays column definitions', () => {
    render(<TableWorkspace schema={mockSchema} selectedTable="users" onSelectTable={vi.fn()} />)

    fireEvent.click(screen.getByText(/Columns & Structure/))

    expect(screen.getAllByText('Column Name')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Nullable')[0]).toBeInTheDocument()
    expect(screen.getByText('Yes (PK)')).toBeInTheDocument()
    expect(screen.getAllByText('No (NOT NULL)')[0]).toBeInTheDocument()
  })

  it('switches to DDL tab and renders CREATE TABLE statement', () => {
    render(<TableWorkspace schema={mockSchema} selectedTable="users" onSelectTable={vi.fn()} />)

    fireEvent.click(screen.getByText(/DDL Definition/))

    expect(
      screen.getByText('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copy DDL/i })).toBeInTheDocument()
  })

  it('updates Data Grid when selectedTable prop changes to another table', async () => {
    const { rerender } = render(
      <TableWorkspace schema={mockSchema} selectedTable="users" onSelectTable={vi.fn()} />
    )

    expect(await screen.findByText('alice')).toBeInTheDocument()

    // Rerender with 'orders'
    rerender(<TableWorkspace schema={mockSchema} selectedTable="orders" onSelectTable={vi.fn()} />)

    expect(await screen.findByText('250')).toBeInTheDocument()
  })
})
