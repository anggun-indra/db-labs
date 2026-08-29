import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResultViewer } from './ResultViewer'
import type { QueryExecutionResult } from '@/lib/sqlite/queryResult'

describe('ResultViewer', () => {
  it('renders empty state when no result is provided', () => {
    render(<ResultViewer result={null} />)
    expect(screen.getByText(/Run a query to see results/i)).toBeInTheDocument()
  })

  it('renders error result with code, raw message, execution time, and educational hint', () => {
    const errorResult: QueryExecutionResult = {
      kind: 'error',
      executionTimeMs: 1.5,
      error: {
        raw: 'NOT NULL constraint failed: users.username',
        code: 'NOT_NULL_CONSTRAINT',
        hint: 'Column users.username has a NOT NULL constraint and cannot be empty or NULL. Provide a valid non-null value for it in your INSERT or UPDATE statement.'
      }
    }

    render(<ResultViewer result={errorResult} />)

    expect(screen.getByText('Execution Error')).toBeInTheDocument()
    expect(screen.getByText('NOT_NULL_CONSTRAINT')).toBeInTheDocument()
    expect(screen.getByText(/1\.5 ms/)).toBeInTheDocument()
    expect(screen.getByText('NOT NULL constraint failed: users.username')).toBeInTheDocument()
    const hint = screen.getByTestId('error-hint')
    expect(hint).toHaveTextContent('Column users.username has a NOT NULL constraint')
  })

  it('renders mutation result with affected rows and execution time', () => {
    const mutationResult: QueryExecutionResult = {
      kind: 'mutation',
      affectedRows: 3,
      executionTimeMs: 2.12
    }

    render(<ResultViewer result={mutationResult} />)

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('3 row(s) affected')).toBeInTheDocument()
    expect(screen.getAllByText(/2\.1 ms/)[0]).toBeInTheDocument()
    expect(screen.getByText(/3 row\(s\) modified/i)).toBeInTheDocument()
  })

  it('renders 0-rows affected mutation with educational note and execution time', () => {
    const mutationResult: QueryExecutionResult = {
      kind: 'mutation',
      affectedRows: 0,
      executionTimeMs: 0.8
    }

    render(<ResultViewer result={mutationResult} />)

    expect(screen.getByText('0 row(s) affected')).toBeInTheDocument()
    expect(screen.getAllByText(/0\.8 ms/)[0]).toBeInTheDocument()
    expect(screen.getByText(/0 rows affected/i)).toBeInTheDocument()
  })

  it('renders rows query result with columns, values, and execution metrics', () => {
    const rowsResult: QueryExecutionResult = {
      kind: 'rows',
      columns: ['id', 'username', 'email'],
      rows: [
        [1, 'alice', 'alice@example.com'],
        [2, 'bob', null]
      ],
      affectedRows: 0,
      executionTimeMs: 3.4
    }

    render(<ResultViewer result={rowsResult} />)

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText(/2 row\(s\)/)).toBeInTheDocument()
    expect(screen.getByText('3 col(s)')).toBeInTheDocument()
    expect(screen.getByText(/3\.4 ms/)).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('NULL')).toBeInTheDocument()
  })
})
