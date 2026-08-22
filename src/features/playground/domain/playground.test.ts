import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { capRows, pickExecutableSql, RESULT_RENDER_CAP } from './sqlExecution'
import { appendHistory, clearHistory, HISTORY_CAP, loadHistory } from './queryHistory'
import { loadDraft, saveDraft } from './draftStorage'
import {
  buildDeleteByRowid,
  buildInsert,
  buildSelectRows,
  buildUpdateByRowid,
  renderSqlValue
} from './rowMutations'
import type { ColumnInfo } from '@/lib/sqlite/schemaIntrospect'

describe('pickExecutableSql', () => {
  it('prefers a non-empty selection', () => {
    expect(pickExecutableSql('SELECT 1; SELECT 2;', 'SELECT 2;')).toBe('SELECT 2;')
  })

  it('falls back to full text when selection is empty or whitespace', () => {
    expect(pickExecutableSql('SELECT 1;', '')).toBe('SELECT 1;')
    expect(pickExecutableSql('SELECT 1;', '   ')).toBe('SELECT 1;')
    expect(pickExecutableSql('SELECT 1;', null)).toBe('SELECT 1;')
  })

  it('trims the result', () => {
    expect(pickExecutableSql('  SELECT 1;  ', null)).toBe('SELECT 1;')
  })
})

describe('capRows', () => {
  it('keeps small results untouched', () => {
    const rows = [[1], [2]]
    expect(capRows(rows)).toEqual({ displayRows: rows, totalRows: 2, capped: false })
  })

  it('caps large results without mutating the input', () => {
    const rows = Array.from({ length: RESULT_RENDER_CAP + 10 }, (_, i) => [i])
    const result = capRows(rows)
    expect(result.capped).toBe(true)
    expect(result.totalRows).toBe(RESULT_RENDER_CAP + 10)
    expect(result.displayRows).toHaveLength(RESULT_RENDER_CAP)
    expect(rows).toHaveLength(RESULT_RENDER_CAP + 10)
  })
})

describe('toCsv', () => {
  it('renders headers and rows', () => {
    expect(toCsv(['id', 'name'], [[1, 'Andi'], [2, 'Budi']])).toBe(
      'id,name\n1,Andi\n2,Budi'
    )
  })

  it('quotes cells with commas, quotes and newlines', () => {
    expect(toCsv(['a'], [['he said "hi", ok'], ['line1\nline2']])).toBe(
      'a\n"he said ""hi"", ok"\n"line1\nline2"'
    )
  })

  it('renders NULL as empty cell', () => {
    expect(toCsv(['a'], [[null]])).toBe('a\n')
  })
})

describe('queryHistory', () => {
  it('appends newest first and persists', () => {
    const entries = appendHistory('p1', { sql: 'SELECT 1;', ok: true, executionTimeMs: 2 })
    appendHistory('p1', { sql: 'SELECT 2;', ok: false, executionTimeMs: 5 })

    const loaded = loadHistory('p1')
    expect(loaded).toHaveLength(2)
    expect(loaded[0].sql).toBe('SELECT 2;')
    expect(loaded[0].ok).toBe(false)
    expect(loaded[1].sql).toBe('SELECT 1;')
    expect(entries[0].id).toBeTruthy()
    expect(entries[0].timestamp).toBeGreaterThan(0)
  })

  it('caps history length', () => {
    for (let i = 0; i < HISTORY_CAP + 5; i++) {
      appendHistory('p2', { sql: `SELECT ${i};`, ok: true, executionTimeMs: 1 })
    }
    expect(loadHistory('p2')).toHaveLength(HISTORY_CAP)
    expect(loadHistory('p2')[0].sql).toBe(`SELECT ${HISTORY_CAP + 4};`)
  })

  it('keeps projects isolated and clearable', () => {
    appendHistory('p3', { sql: 'SELECT 1;', ok: true, executionTimeMs: 1 })
    expect(loadHistory('p4')).toEqual([])
    clearHistory('p3')
    expect(loadHistory('p3')).toEqual([])
  })

  it('ignores corrupt storage', () => {
    localStorage.setItem('dblab:sql-history:bad', '{oops')
    expect(loadHistory('bad')).toEqual([])
  })
})

describe('draftStorage', () => {
  it('roundtrips drafts per project', () => {
    expect(loadDraft('p1')).toBe('')
    saveDraft('p1', 'SELECT * FROM customers;')
    expect(loadDraft('p1')).toBe('SELECT * FROM customers;')
    expect(loadDraft('p2')).toBe('')
  })
})

describe('rowMutations', () => {
  const columns: ColumnInfo[] = [
    { name: 'id', type: 'INTEGER', notnull: false, pk: true, defaultValue: null },
    { name: 'name', type: 'TEXT', notnull: true, pk: false, defaultValue: null },
    { name: 'balance', type: 'REAL', notnull: false, pk: false, defaultValue: null }
  ]

  it('renders values by column type', () => {
    expect(renderSqlValue('INTEGER', '42')).toBe('42')
    expect(renderSqlValue('REAL', '-1.5')).toBe('-1.5')
    expect(renderSqlValue('TEXT', '42')).toBe("'42'")
    expect(renderSqlValue('TEXT', '')).toBe('NULL')
    expect(renderSqlValue('TEXT', "O'Brien")).toBe("'O''Brien'")
    expect(renderSqlValue('DATETIME', 'CURRENT_TIMESTAMP')).toBe('CURRENT_TIMESTAMP')
  })

  it('builds SELECT with rowid alias', () => {
    expect(buildSelectRows('customers', 50, 100)).toBe(
      'SELECT rowid AS __rowid, * FROM customers LIMIT 50 OFFSET 100;'
    )
  })

  it('builds INSERT with quoted identifiers and typed literals', () => {
    expect(buildInsert('weird table', columns, ['7', "O'Brien", ''])).toBe(
      `INSERT INTO "weird table" (id, name, balance) VALUES (7, 'O''Brien', NULL);`
    )
  })

  it('builds UPDATE and DELETE by rowid', () => {
    expect(buildUpdateByRowid('customers', columns, ['7', 'Budi', '10.5'], 3)).toBe(
      `UPDATE customers SET id = 7, name = 'Budi', balance = 10.5 WHERE rowid = 3;`
    )
    expect(buildDeleteByRowid('customers', 3)).toBe('DELETE FROM customers WHERE rowid = 3;')
  })
})
