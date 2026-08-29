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

  it('explains table has no column named', () => {
    const explanation = explainSqliteError('table users has no column named age')
    expect(explanation?.code).toBe('NO_SUCH_COLUMN_IN_TABLE')
    expect(explanation?.hint).toContain('age')
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
    expect(explainSqliteError('CHECK constraint failed: price > 0')?.code).toBe('CHECK_CONSTRAINT')
  })

  it('explains wrong column count on insert', () => {
    expect(explainSqliteError('2 values for 3 columns')?.code).toBe('WRONG_COLUMN_COUNT')
    expect(explainSqliteError('table users has 3 columns but 2 values were supplied')?.code).toBe(
      'WRONG_COLUMN_COUNT'
    )
  })

  it('explains datatype mismatch and unrecognized tokens', () => {
    expect(explainSqliteError('datatype mismatch')?.code).toBe('DATATYPE_MISMATCH')
    expect(explainSqliteError('unrecognized token: "@"')?.code).toBe('UNRECOGNIZED_TOKEN')
    expect(explainSqliteError('incomplete input')?.code).toBe('INCOMPLETE_INPUT')
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
