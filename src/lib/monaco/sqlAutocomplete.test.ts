import { describe, expect, it } from 'vitest'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'
import {
  extractCurrentStatement,
  extractAliasesAndTables,
  parseSqlContext,
  formatTableDocumentation,
  formatColumnDocumentation,
  getSqlCompletions,
  SQL_KEYWORDS,
  SQL_FUNCTIONS
} from './sqlAutocomplete'

const mockSchema: TableInfo[] = [
  {
    name: 'users',
    createSql:
      'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT, role_id INTEGER);',
    rowCount: 25,
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, notnull: true, defaultValue: null },
      { name: 'username', type: 'TEXT', pk: false, notnull: true, defaultValue: null },
      { name: 'email', type: 'TEXT', pk: false, notnull: false, defaultValue: null },
      { name: 'role_id', type: 'INTEGER', pk: false, notnull: false, defaultValue: null }
    ],
    foreignKeys: [{ fromColumn: 'role_id', toTable: 'roles', toColumn: 'id' }],
    indexes: [{ name: 'idx_users_email', unique: true, columns: ['email'] }]
  },
  {
    name: 'roles',
    createSql: 'CREATE TABLE roles (id INTEGER PRIMARY KEY, role_name TEXT NOT NULL);',
    rowCount: 3,
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, notnull: true, defaultValue: null },
      { name: 'role_name', type: 'TEXT', pk: false, notnull: true, defaultValue: null }
    ],
    foreignKeys: [],
    indexes: []
  },
  {
    name: 'orders',
    createSql: 'CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, total REAL);',
    rowCount: 100,
    columns: [
      { name: 'id', type: 'INTEGER', pk: true, notnull: true, defaultValue: null },
      { name: 'user_id', type: 'INTEGER', pk: false, notnull: true, defaultValue: null },
      { name: 'total', type: 'REAL', pk: false, notnull: true, defaultValue: '0.0' }
    ],
    foreignKeys: [{ fromColumn: 'user_id', toTable: 'users', toColumn: 'id' }],
    indexes: []
  }
]

const dummyRange = {
  startLineNumber: 1,
  endLineNumber: 1,
  startColumn: 1,
  endColumn: 1
}

describe('sqlAutocomplete', () => {
  describe('extractCurrentStatement', () => {
    it('extracts single statement without semicolon', () => {
      const sql = 'SELECT * FROM users'
      const res = extractCurrentStatement(sql, 10)
      expect(res.statement).toBe('SELECT * FROM users')
      expect(res.offsetInStatement).toBe(10)
    })

    it('extracts active statement between multiple statements', () => {
      const sql = 'SELECT 1;\nSELECT * FROM users WHERE id = 2;\nSELECT 3;'
      // Position inside second query
      const offset = 18
      const res = extractCurrentStatement(sql, offset)
      expect(res.statement.trim()).toBe('SELECT * FROM users WHERE id = 2;')
    })

    it('ignores semicolons inside string literals', () => {
      const sql = "SELECT '; not a statement ;' FROM users WHERE id = 1;"
      const res = extractCurrentStatement(sql, 25)
      expect(res.statement).toBe(sql)
    })
  })

  describe('extractAliasesAndTables', () => {
    it('extracts table names and aliases from FROM and JOIN clauses', () => {
      const sql = 'SELECT u.username, r.role_name FROM users AS u JOIN roles r ON u.role_id = r.id'
      const { aliases, referencedTables } = extractAliasesAndTables(sql)

      expect(referencedTables).toContain('users')
      expect(referencedTables).toContain('roles')
      expect(aliases.get('u')).toBe('users')
      expect(aliases.get('r')).toBe('roles')
      expect(aliases.get('users')).toBe('users')
      expect(aliases.get('roles')).toBe('roles')
    })

    it('extracts aliases from comma-separated FROM clause', () => {
      const sql = 'SELECT * FROM users u, orders o WHERE u.id = o.user_id'
      const { aliases, referencedTables } = extractAliasesAndTables(sql)

      expect(referencedTables).toContain('users')
      expect(referencedTables).toContain('orders')
      expect(aliases.get('u')).toBe('users')
      expect(aliases.get('o')).toBe('orders')
    })

    it('does not treat SQL keywords after table name as alias', () => {
      const sql = 'SELECT * FROM users WHERE id = 1'
      const { aliases, referencedTables } = extractAliasesAndTables(sql)

      expect(referencedTables).toContain('users')
      expect(aliases.get('where')).toBeUndefined()
    })
  })

  describe('parseSqlContext', () => {
    it('detects dot prefix and partial word', () => {
      const sql = 'SELECT u.user'
      const ctx = parseSqlContext(sql, sql.length)
      expect(ctx.dotPrefix).toBe('u')
      expect(ctx.currentWord).toBe('user')
    })

    it('detects dot prefix right after dot', () => {
      const sql = 'SELECT users.'
      const ctx = parseSqlContext(sql, sql.length)
      expect(ctx.dotPrefix).toBe('users')
      expect(ctx.currentWord).toBe('')
    })

    it('identifies active clause', () => {
      expect(parseSqlContext('SELECT id, ', 11).clause).toBe('SELECT')
      expect(parseSqlContext('SELECT * FROM ', 14).clause).toBe('FROM')
      expect(parseSqlContext('SELECT * FROM users WHERE ', 26).clause).toBe('WHERE')
      expect(parseSqlContext('SELECT * FROM users JOIN ', 25).clause).toBe('JOIN')
      expect(parseSqlContext('UPDATE users SET ', 17).clause).toBe('SET')
    })
  })

  describe('formatTableDocumentation & formatColumnDocumentation', () => {
    it('formats rich table markdown documentation', () => {
      const doc = formatTableDocumentation(mockSchema[0])
      expect(doc).toContain('Table `users`')
      expect(doc).toContain('`id`')
      expect(doc).toContain('`PRIMARY KEY`')
      expect(doc).toContain('`username`')
      expect(doc).toContain('`NOT NULL`')
      expect(doc).toContain('`role_id` ➔ `roles.id`')
      expect(doc).toContain('idx_users_email')
    })

    it('formats column markdown documentation with FK reference', () => {
      const doc = formatColumnDocumentation('users', mockSchema[0].columns[3], mockSchema[0])
      expect(doc).toContain('Column `users.role_id`')
      expect(doc).toContain('Foreign Key:')
      expect(doc).toContain('References `roles.id`')
    })
  })

  describe('getSqlCompletions', () => {
    it('returns only columns of specific table when dot-triggered with direct table name', () => {
      const sql = 'SELECT users.'
      const items = getSqlCompletions(mockSchema, sql, sql.length, dummyRange)

      expect(items.length).toBe(4)
      const labels = items.map((i) => i.label)
      expect(labels).toEqual(['id', 'username', 'email', 'role_id'])
      expect(
        items.every((i) => typeof i.documentation === 'object' && 'value' in i.documentation)
      ).toBe(true)
    })

    it('resolves table alias when dot-triggered', () => {
      const sql = 'SELECT u. FROM users u'
      // Cursor right after `u.`
      const offset = 'SELECT u.'.length
      const items = getSqlCompletions(mockSchema, sql, offset, dummyRange)

      expect(items.length).toBe(4)
      const labels = items.map((i) => i.label)
      expect(labels).toEqual(['id', 'username', 'email', 'role_id'])
    })

    it('handles case-insensitive alias in dot-trigger', () => {
      const sql = 'SELECT U. FROM users u'
      const offset = 'SELECT U.'.length
      const items = getSqlCompletions(mockSchema, sql, offset, dummyRange)

      expect(items.length).toBe(4)
      const labels = items.map((i) => i.label)
      expect(labels).toEqual(['id', 'username', 'email', 'role_id'])
    })

    it('prioritizes table names after FROM clause', () => {
      const sql = 'SELECT * FROM '
      const items = getSqlCompletions(mockSchema, sql, sql.length, dummyRange)

      const userTableItem = items.find((i) => i.label === 'users')
      expect(userTableItem).toBeDefined()
      expect(userTableItem?.sortText).toMatch(/^0_/)
    })

    it('generates smart FK join snippets when JOIN is used', () => {
      const sql = 'SELECT * FROM orders JOIN '
      const items = getSqlCompletions(mockSchema, sql, sql.length, dummyRange)

      const fkJoinSnippet = items.find((i) =>
        String(i.label).includes('JOIN users ON orders.user_id = users.id')
      )
      expect(fkJoinSnippet).toBeDefined()
      expect(fkJoinSnippet?.insertText).toBe('users ON orders.user_id = users.id')
    })

    it('prioritizes columns of referenced table in WHERE clause', () => {
      const sql = 'SELECT * FROM users WHERE '
      const items = getSqlCompletions(mockSchema, sql, sql.length, dummyRange)

      const usernameItem = items.find((i) => i.label === 'username')
      expect(usernameItem).toBeDefined()
      expect(usernameItem?.sortText).toMatch(/^0_/)
    })

    it('includes built-in SQLite functions with snippets and docs', () => {
      const sql = 'SELECT '
      const items = getSqlCompletions(mockSchema, sql, sql.length, dummyRange)

      const countFn = items.find((i) => i.label === 'COUNT')
      expect(countFn).toBeDefined()
      expect(countFn?.insertText).toBe('COUNT(${1:*})')
      expect(countFn?.detail).toContain('Aggregate')

      const coalesceFn = items.find((i) => i.label === 'COALESCE')
      expect(coalesceFn).toBeDefined()
      expect(coalesceFn?.insertText).toBe('COALESCE(${1:val1}, ${2:val2})')
    })

    it('includes SQL keywords', () => {
      const sql = 'S'
      const items = getSqlCompletions(mockSchema, sql, sql.length, dummyRange)

      for (const kw of ['SELECT', 'WHERE', 'ORDER BY', 'LIMIT']) {
        const item = items.find((i) => i.label === kw)
        expect(item).toBeDefined()
      }
      expect(SQL_KEYWORDS).toContain('SELECT')
      expect(SQL_KEYWORDS).toContain('INNER JOIN')
    })

    it('exports all standard SQL functions with documentation', () => {
      expect(SQL_FUNCTIONS.length).toBeGreaterThan(20)
      const countFn = SQL_FUNCTIONS.find((f) => f.name === 'COUNT')
      expect(countFn?.category).toBe('Aggregate')
      expect(countFn?.description).toBeTruthy()
    })
  })
})
