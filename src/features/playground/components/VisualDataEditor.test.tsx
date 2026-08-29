import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VisualDataEditor } from './VisualDataEditor'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'
import { sqliteService } from '@/lib/sqlite/sqlJsRuntime'
import { usePlaygroundStore } from '../playgroundStore'

vi.mock('@/lib/sqlite/sqlJsRuntime', () => ({
  sqliteService: {
    execute: vi.fn(),
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
    rowCount: 1
  }
]

describe('VisualDataEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePlaygroundStore.setState({
      projectId: 'test-project',
      sql: '',
      result: null,
      running: false,
      history: [],
      lastMutationSql: null
    })
  })

  it('renders empty state when schema is empty', () => {
    render(<VisualDataEditor schema={[]} />)
    expect(
      screen.getByText(/Create a database first to edit its data visually/i)
    ).toBeInTheDocument()
  })

  it('loads and renders rows for the selected table', async () => {
    vi.mocked(sqliteService.execute).mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT')) {
        return {
          kind: 'rows',
          columns: ['__rowid', 'id', 'username'],
          rows: [[1, 1, 'alice']],
          affectedRows: 0,
          executionTimeMs: 0.5
        }
      }
      return { kind: 'mutation', affectedRows: 1, executionTimeMs: 0.5 }
    })

    render(<VisualDataEditor schema={mockSchema} />)

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })
    expect(screen.getByText('users (1 rows)')).toBeInTheDocument()
  })

  it('displays error in modal and keeps modal open when Add row fails', async () => {
    vi.mocked(sqliteService.execute).mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT')) {
        return {
          kind: 'rows',
          columns: ['__rowid', 'id', 'username'],
          rows: [[1, 1, 'alice']],
          affectedRows: 0,
          executionTimeMs: 0.5
        }
      }
      if (sql.includes('INSERT')) {
        return {
          kind: 'error',
          executionTimeMs: 1.2,
          error: {
            raw: 'NOT NULL constraint failed: users.username',
            code: 'NOT_NULL_CONSTRAINT',
            hint: 'Column users.username has a NOT NULL constraint. Provide a non-null value.'
          }
        }
      }
      return { kind: 'mutation', affectedRows: 1, executionTimeMs: 0.5 }
    })

    render(<VisualDataEditor schema={mockSchema} />)

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    // Open Add Row modal
    fireEvent.click(screen.getByRole('button', { name: /Add row/i }))
    expect(screen.getByText('Add row to users')).toBeInTheDocument()

    // Click Insert row
    fireEvent.click(screen.getByRole('button', { name: /Insert row/i }))

    await waitFor(() => {
      expect(screen.getByText('NOT NULL constraint failed: users.username')).toBeInTheDocument()
    })
    expect(screen.getByText('NOT_NULL_CONSTRAINT')).toBeInTheDocument()
    expect(screen.getByTestId('modal-error-hint')).toHaveTextContent(
      'Column users.username has a NOT NULL constraint'
    )
    // Modal is still open so student can fix it
    expect(screen.getByText('Add row to users')).toBeInTheDocument()
  })

  it('closes modal and refreshes rows on successful insert', async () => {
    let inserted = false
    vi.mocked(sqliteService.execute).mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT')) {
        inserted = true
        return { kind: 'mutation', affectedRows: 1, executionTimeMs: 0.8 }
      }
      if (sql.includes('SELECT')) {
        return {
          kind: 'rows',
          columns: ['__rowid', 'id', 'username'],
          rows: inserted
            ? [
                [1, 1, 'alice'],
                [2, 2, 'bob']
              ]
            : [[1, 1, 'alice']],
          affectedRows: 0,
          executionTimeMs: 0.5
        }
      }
      return { kind: 'mutation', affectedRows: 1, executionTimeMs: 0.5 }
    })

    render(<VisualDataEditor schema={mockSchema} />)

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Add row/i }))
    expect(screen.getByText('Add row to users')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Insert row/i }))

    await waitFor(() => {
      expect(screen.getByText('bob')).toBeInTheDocument()
    })
  })
})
