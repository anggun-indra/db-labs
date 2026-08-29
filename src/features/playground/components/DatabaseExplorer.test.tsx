import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DatabaseExplorer } from './DatabaseExplorer'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'

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
    createSql: 'CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER);',
    columns: [
      { name: 'id', type: 'INTEGER', notnull: true, pk: true, defaultValue: null },
      { name: 'user_id', type: 'INTEGER', notnull: false, pk: false, defaultValue: null }
    ],
    foreignKeys: [{ fromColumn: 'user_id', toTable: 'users', toColumn: 'id' }],
    indexes: [],
    rowCount: 12
  }
]

describe('DatabaseExplorer', () => {
  it('renders table list and row counts', () => {
    render(
      <DatabaseExplorer
        schema={mockSchema}
        selectedTable="users"
        onSelectTable={vi.fn()}
        onOpenTableData={vi.fn()}
        onGenerateQuery={vi.fn()}
      />
    )

    expect(screen.getByText(/TABLES \(2\)/)).toBeInTheDocument()
    expect(screen.getByText('users')).toBeInTheDocument()
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('filters tables by search query', () => {
    render(
      <DatabaseExplorer
        schema={mockSchema}
        selectedTable="users"
        onSelectTable={vi.fn()}
        onOpenTableData={vi.fn()}
        onGenerateQuery={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Filter tables...')
    fireEvent.change(input, { target: { value: 'ord' } })

    expect(screen.queryByText('users')).not.toBeInTheDocument()
    expect(screen.getByText('orders')).toBeInTheDocument()
  })

  it('expands table to show columns and constraint tags', () => {
    render(
      <DatabaseExplorer
        schema={mockSchema}
        selectedTable="users"
        onSelectTable={vi.fn()}
        onOpenTableData={vi.fn()}
        onGenerateQuery={vi.fn()}
      />
    )

    const toggle = screen.getByLabelText('Toggle columns for users')
    fireEvent.click(toggle)

    expect(screen.getByText('username')).toBeInTheDocument()
    expect(screen.getByText('INTEGER')).toBeInTheDocument()
    expect(screen.getByText('PK')).toBeInTheDocument()
    expect(screen.getAllByText('NN').length).toBeGreaterThanOrEqual(1)
  })

  it('triggers quick actions on button clicks', () => {
    const onSelectTable = vi.fn()
    const onOpenTableData = vi.fn()
    const onGenerateQuery = vi.fn()

    render(
      <DatabaseExplorer
        schema={mockSchema}
        selectedTable="users"
        onSelectTable={onSelectTable}
        onOpenTableData={onOpenTableData}
        onGenerateQuery={onGenerateQuery}
      />
    )

    fireEvent.click(screen.getByText('orders'))
    expect(onSelectTable).toHaveBeenCalledWith('orders')
  })
})
