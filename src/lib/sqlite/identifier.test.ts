import { describe, expect, it } from 'vitest'
import { isSafeUnquotedIdentifier, quoteIdentifier, quoteStringLiteral } from './identifier'

describe('identifier', () => {
  it('keeps simple identifiers unquoted', () => {
    expect(isSafeUnquotedIdentifier('customers')).toBe(true)
    expect(quoteIdentifier('customers')).toBe('customers')
    expect(quoteIdentifier('_private_2')).toBe('_private_2')
  })

  it('quotes identifiers starting with digits or containing special chars', () => {
    expect(quoteIdentifier('1table')).toBe('"1table"')
    expect(quoteIdentifier('my-table')).toBe('"my-table"')
    expect(quoteIdentifier('with space')).toBe('"with space"')
    expect(quoteIdentifier('')).toBe('""')
  })

  it('quotes SQLite keywords', () => {
    expect(quoteIdentifier('order')).toBe('"order"')
    expect(quoteIdentifier('TABLE')).toBe('"TABLE"')
    expect(quoteIdentifier('group')).toBe('"group"')
  })

  it('escapes embedded double quotes', () => {
    expect(quoteIdentifier('we"ird')).toBe('"we""ird"')
  })

  it('escapes string literals', () => {
    expect(quoteStringLiteral("O'Brien")).toBe("'O''Brien'")
    expect(quoteStringLiteral('plain')).toBe("'plain'")
  })
})
