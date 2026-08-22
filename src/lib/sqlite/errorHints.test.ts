import { describe, expect, it } from 'vitest'
import { explainSqliteError } from './errorHints'

describe('explainSqliteError', () => {
  it('explains missing tables', () => {
    const explanation = explainSqliteError('no such table: customers')
    expect(explanation?.code).toBe('NO_SUCH_TABLE')
    expect(explanation?.hint).toContain('customers')
  })

  it('explains missing columns', () => {
    const explanation = explainSqliteError('no such column: customer_name')
    expect(explanation?.code).toBe('NO_SUCH_COLUMN')
    expect(explanation?.hint).toContain('customer_name')
  })

  it('explains syntax errors', () => {
    const explanation = explainSqliteError('near "SELEC": syntax error')
    expect(explanation?.code).toBe('SYNTAX_ERROR')
  })

  it('explains constraint failures', () => {
    expect(explainSqliteError('UNIQUE constraint failed: customers.email')?.code).toBe(
      'UNIQUE_CONSTRAINT'
    )
    expect(explainSqliteError('NOT NULL constraint failed: customers.name')?.code).toBe(
      'NOT_NULL_CONSTRAINT'
    )
    expect(explainSqliteError('FOREIGN KEY constraint failed')?.code).toBe('FOREIGN_KEY_CONSTRAINT')
    expect(explainSqliteError('PRIMARY KEY constraint failed')?.code).toBe('PRIMARY_KEY_CONSTRAINT')
  })

  it('explains ambiguous columns', () => {
    const explanation = explainSqliteError('ambiguous column name: id')
    expect(explanation?.code).toBe('AMBIGUOUS_COLUMN')
    expect(explanation?.hint).toContain('customers.id')
  })

  it('returns null for unknown errors', () => {
    expect(explainSqliteError('database disk image is malformed')).toBeNull()
  })
})
