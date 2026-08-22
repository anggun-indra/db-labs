import { describe, expect, it } from 'vitest'
import { renderDefaultValue, sqliteTypeDeclaration } from './typeMapping'

describe('typeMapping', () => {
  it('keeps teaching type names (SQLite derives affinity)', () => {
    expect(sqliteTypeDeclaration('INTEGER')).toBe('INTEGER')
    expect(sqliteTypeDeclaration('BOOLEAN')).toBe('BOOLEAN')
    expect(sqliteTypeDeclaration('DATETIME')).toBe('DATETIME')
  })

  it('renders numeric defaults raw for numeric-like types', () => {
    expect(renderDefaultValue('INTEGER', '0')).toBe('0')
    expect(renderDefaultValue('REAL', '-1.5')).toBe('-1.5')
    expect(renderDefaultValue('BOOLEAN', '1')).toBe('1')
  })

  it('wraps non-numeric defaults as string literals', () => {
    expect(renderDefaultValue('TEXT', 'hello')).toBe("'hello'")
    expect(renderDefaultValue('TEXT', "it's")).toBe("'it''s'")
    // numeric text on a TEXT column stays a string
    expect(renderDefaultValue('TEXT', '42')).toBe("'42'")
  })

  it('keeps already-quoted defaults untouched', () => {
    expect(renderDefaultValue('TEXT', "'preset'")).toBe("'preset'")
  })

  it('handles DATE/DATETIME defaults', () => {
    expect(renderDefaultValue('DATE', '2024-01-01')).toBe("'2024-01-01'")
    expect(renderDefaultValue('DATETIME', 'CURRENT_TIMESTAMP')).toBe('CURRENT_TIMESTAMP')
    expect(renderDefaultValue('DATE', "datetime('now')")).toBe("datetime('now')")
    expect(renderDefaultValue('DATETIME', '1700000000')).toBe('1700000000')
  })

  it('returns null for empty defaults', () => {
    expect(renderDefaultValue('TEXT', undefined)).toBeNull()
    expect(renderDefaultValue('TEXT', '   ')).toBeNull()
  })
})
