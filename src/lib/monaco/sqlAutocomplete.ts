import type * as Monaco from 'monaco-editor'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'

/**
 * SQL Keywords for completion
 */
export const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'CROSS JOIN',
  'ON',
  'USING',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'CREATE INDEX',
  'DROP INDEX',
  'CREATE VIEW',
  'DROP VIEW',
  'PRAGMA',
  'DISTINCT',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'BETWEEN',
  'LIKE',
  'GLOB',
  'IS NULL',
  'IS NOT NULL',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'EXISTS',
  'UNION',
  'UNION ALL',
  'INTERSECT',
  'EXCEPT',
  'PRIMARY KEY',
  'FOREIGN KEY',
  'REFERENCES',
  'DEFAULT',
  'CHECK',
  'UNIQUE',
  'AUTOINCREMENT',
  'CASCADE',
  'RESTRICT',
  'BEGIN TRANSACTION',
  'COMMIT',
  'ROLLBACK',
  'EXPLAIN QUERY PLAN'
]

export interface SqlFunctionDef {
  name: string
  snippet: string
  signature: string
  description: string
  category: 'Aggregate' | 'String' | 'Date & Time' | 'Math' | 'Conditional' | 'JSON' | 'Utility'
}

export const SQL_FUNCTIONS: SqlFunctionDef[] = [
  // Aggregate
  {
    name: 'COUNT',
    snippet: 'COUNT(${1:*})',
    signature: 'COUNT(X)',
    description: 'Returns the total number of rows or non-null values in the group.',
    category: 'Aggregate'
  },
  {
    name: 'SUM',
    snippet: 'SUM(${1:column})',
    signature: 'SUM(X)',
    description:
      'Returns the sum of all non-null values in the group as a floating point or integer.',
    category: 'Aggregate'
  },
  {
    name: 'AVG',
    snippet: 'AVG(${1:column})',
    signature: 'AVG(X)',
    description: 'Returns the average (mean) value of all non-null values in the group.',
    category: 'Aggregate'
  },
  {
    name: 'MIN',
    snippet: 'MIN(${1:column})',
    signature: 'MIN(X)',
    description: 'Returns the minimum value in the group.',
    category: 'Aggregate'
  },
  {
    name: 'MAX',
    snippet: 'MAX(${1:column})',
    signature: 'MAX(X)',
    description: 'Returns the maximum value in the group.',
    category: 'Aggregate'
  },
  {
    name: 'TOTAL',
    snippet: 'TOTAL(${1:column})',
    signature: 'TOTAL(X)',
    description:
      'Returns the sum of all non-null numeric values in the group as floating point (never returns NULL).',
    category: 'Aggregate'
  },
  {
    name: 'GROUP_CONCAT',
    snippet: "GROUP_CONCAT(${1:column}, ${2:', '})'",
    signature: 'GROUP_CONCAT(X, [Y])',
    description:
      'Returns a string which is the concatenation of all non-NULL values of X separated by Y.',
    category: 'Aggregate'
  },

  // String
  {
    name: 'LENGTH',
    snippet: 'LENGTH(${1:text})',
    signature: 'LENGTH(X)',
    description: 'Returns the length of a string in characters or blob in bytes.',
    category: 'String'
  },
  {
    name: 'LOWER',
    snippet: 'LOWER(${1:text})',
    signature: 'LOWER(X)',
    description: 'Returns a copy of string X with all ASCII characters converted to lower case.',
    category: 'String'
  },
  {
    name: 'UPPER',
    snippet: 'UPPER(${1:text})',
    signature: 'UPPER(X)',
    description: 'Returns a copy of string X with all ASCII characters converted to upper case.',
    category: 'String'
  },
  {
    name: 'SUBSTR',
    snippet: 'SUBSTR(${1:text}, ${2:start}, ${3:length})',
    signature: 'SUBSTR(X, Y, [Z])',
    description: 'Returns a substring of string X starting at 1-based index Y with length Z.',
    category: 'String'
  },
  {
    name: 'TRIM',
    snippet: 'TRIM(${1:text})',
    signature: 'TRIM(X, [Y])',
    description: 'Removes leading and trailing characters from string X (defaults to spaces).',
    category: 'String'
  },
  {
    name: 'LTRIM',
    snippet: 'LTRIM(${1:text})',
    signature: 'LTRIM(X, [Y])',
    description: 'Removes leading characters from string X (defaults to spaces).',
    category: 'String'
  },
  {
    name: 'RTRIM',
    snippet: 'RTRIM(${1:text})',
    signature: 'RTRIM(X, [Y])',
    description: 'Removes trailing characters from string X (defaults to spaces).',
    category: 'String'
  },
  {
    name: 'REPLACE',
    snippet: 'REPLACE(${1:text}, ${2:pattern}, ${3:replacement})',
    signature: 'REPLACE(X, Y, Z)',
    description:
      'Returns a string formed by substituting string Z for every occurrence of string Y in string X.',
    category: 'String'
  },
  {
    name: 'INSTR',
    snippet: 'INSTR(${1:text}, ${2:search})',
    signature: 'INSTR(X, Y)',
    description:
      'Finds the first occurrence of string Y in string X and returns 1-based index, or 0 if not found.',
    category: 'String'
  },
  {
    name: 'PRINTF',
    snippet: "PRINTF(${1:'%s'}, ${2:value})",
    signature: 'PRINTF(FORMAT, ...)',
    description: 'Builds a formatted string according to the format specifier.',
    category: 'String'
  },

  // Date & Time
  {
    name: 'DATE',
    snippet: "DATE(${1:'now'})",
    signature: 'DATE(timestring, [modifiers...])',
    description: 'Returns the date in "YYYY-MM-DD" format.',
    category: 'Date & Time'
  },
  {
    name: 'TIME',
    snippet: "TIME(${1:'now'})",
    signature: 'TIME(timestring, [modifiers...])',
    description: 'Returns the time in "HH:MM:SS" format.',
    category: 'Date & Time'
  },
  {
    name: 'DATETIME',
    snippet: "DATETIME(${1:'now'})",
    signature: 'DATETIME(timestring, [modifiers...])',
    description: 'Returns the date and time in "YYYY-MM-DD HH:MM:SS" format.',
    category: 'Date & Time'
  },
  {
    name: 'JULIANDAY',
    snippet: "JULIANDAY(${1:'now'})",
    signature: 'JULIANDAY(timestring, [modifiers...])',
    description: 'Returns the number of days since noon in Greenwich on November 24, 4714 B.C.',
    category: 'Date & Time'
  },
  {
    name: 'STRFTIME',
    snippet: "STRFTIME(${1:'%Y-%m-%d'}, ${2:'now'})",
    signature: 'STRFTIME(format, timestring, [modifiers...])',
    description:
      'Returns the date formatted according to the format string specified as the first argument.',
    category: 'Date & Time'
  },
  {
    name: 'UNIXEPOCH',
    snippet: "UNIXEPOCH(${1:'now'})",
    signature: 'UNIXEPOCH(timestring, [modifiers...])',
    description: 'Returns a unix timestamp (seconds since 1970-01-01 00:00:00 UTC).',
    category: 'Date & Time'
  },

  // Math
  {
    name: 'ABS',
    snippet: 'ABS(${1:number})',
    signature: 'ABS(X)',
    description: 'Returns the absolute value of numeric argument X.',
    category: 'Math'
  },
  {
    name: 'ROUND',
    snippet: 'ROUND(${1:number}, ${2:2})',
    signature: 'ROUND(X, [Y])',
    description:
      'Returns floating-point value X rounded to Y digits to the right of the decimal point (default 0).',
    category: 'Math'
  },
  {
    name: 'RANDOM',
    snippet: 'RANDOM()',
    signature: 'RANDOM()',
    description:
      'Returns a pseudo-random integer between -9223372036854775808 and +9223372036854775807.',
    category: 'Math'
  },
  {
    name: 'CEIL',
    snippet: 'CEIL(${1:number})',
    signature: 'CEIL(X)',
    description: 'Returns the smallest integer greater than or equal to X.',
    category: 'Math'
  },
  {
    name: 'FLOOR',
    snippet: 'FLOOR(${1:number})',
    signature: 'FLOOR(X)',
    description: 'Returns the largest integer less than or equal to X.',
    category: 'Math'
  },
  {
    name: 'SQRT',
    snippet: 'SQRT(${1:number})',
    signature: 'SQRT(X)',
    description: 'Returns the square root of X.',
    category: 'Math'
  },
  {
    name: 'POWER',
    snippet: 'POWER(${1:base}, ${2:exponent})',
    signature: 'POWER(X, Y)',
    description: 'Returns X raised to power Y.',
    category: 'Math'
  },

  // Conditional / Null / Type
  {
    name: 'COALESCE',
    snippet: 'COALESCE(${1:val1}, ${2:val2})',
    signature: 'COALESCE(X, Y, ...)',
    description:
      'Returns a copy of its first non-NULL argument, or NULL if all arguments are NULL.',
    category: 'Conditional'
  },
  {
    name: 'IFNULL',
    snippet: 'IFNULL(${1:val}, ${2:default_val})',
    signature: 'IFNULL(X, Y)',
    description: 'Returns a copy of its first non-NULL argument (X or Y).',
    category: 'Conditional'
  },
  {
    name: 'NULLIF',
    snippet: 'NULLIF(${1:val1}, ${2:val2})',
    signature: 'NULLIF(X, Y)',
    description: 'Returns NULL if its arguments are equal, otherwise returns the first argument.',
    category: 'Conditional'
  },
  {
    name: 'IIF',
    snippet: 'IIF(${1:condition}, ${2:true_val}, ${3:false_val})',
    signature: 'IIF(X, Y, Z)',
    description: 'Inline-IF: returns Y if X evaluates to true, otherwise Z.',
    category: 'Conditional'
  },
  {
    name: 'TYPEOF',
    snippet: 'TYPEOF(${1:expression})',
    signature: 'TYPEOF(X)',
    description:
      'Returns a string that indicates the datatype of expression X: "null", "integer", "real", "text", or "blob".',
    category: 'Conditional'
  },

  // Utility
  {
    name: 'LAST_INSERT_ROWID',
    snippet: 'LAST_INSERT_ROWID()',
    signature: 'LAST_INSERT_ROWID()',
    description: 'Returns the ROWID of the most recent successful INSERT into a rowid table.',
    category: 'Utility'
  },
  {
    name: 'CHANGES',
    snippet: 'CHANGES()',
    signature: 'CHANGES()',
    description:
      'Returns the number of database rows that were changed or inserted or deleted by the most recently completed SQL statement.',
    category: 'Utility'
  },
  {
    name: 'TOTAL_CHANGES',
    snippet: 'TOTAL_CHANGES()',
    signature: 'TOTAL_CHANGES()',
    description:
      'Returns the total number of row changes caused by INSERT, UPDATE, and DELETE statements since the database connection was opened.',
    category: 'Utility'
  },
  {
    name: 'SQLITE_VERSION',
    snippet: 'SQLITE_VERSION()',
    signature: 'SQLITE_VERSION()',
    description: 'Returns the version string of the SQLite library.',
    category: 'Utility'
  },

  // JSON
  {
    name: 'JSON',
    snippet: 'JSON(${1:json_text})',
    signature: 'JSON(X)',
    description:
      'Verifies that its argument is a valid JSON string and returns a minified version.',
    category: 'JSON'
  },
  {
    name: 'JSON_EXTRACT',
    snippet: "JSON_EXTRACT(${1:json}, ${2:'$.path'})",
    signature: 'JSON_EXTRACT(X, PATH, ...)',
    description: 'Extracts and returns one or more values from the JSON structure X at PATH.',
    category: 'JSON'
  },
  {
    name: 'JSON_ARRAY',
    snippet: 'JSON_ARRAY(${1:val1}, ${2:val2})',
    signature: 'JSON_ARRAY(...)',
    description:
      'Accepts zero or more arguments and returns a well-formed JSON array holding those values.',
    category: 'JSON'
  },
  {
    name: 'JSON_OBJECT',
    snippet: "JSON_OBJECT(${1:'key'}, ${2:value})",
    signature: 'JSON_OBJECT(KEY, VALUE, ...)',
    description: 'Accepts zero or more pairs of arguments and returns a well-formed JSON object.',
    category: 'JSON'
  }
]

export interface SqlSnippetDef {
  label: string
  snippet: string
  detail: string
  documentation: string
}

export const SQL_SNIPPETS: SqlSnippetDef[] = [
  {
    label: 'SELECT * FROM ...',
    snippet: 'SELECT * FROM ${1:table_name};',
    detail: 'Select all query template',
    documentation: 'Select all columns from a table'
  },
  {
    label: 'SELECT ... WHERE ...',
    snippet: 'SELECT ${1:*}\nFROM ${2:table_name}\nWHERE ${3:condition};',
    detail: 'Select with WHERE clause',
    documentation: 'Select columns with a filter condition'
  },
  {
    label: 'INSERT INTO ... VALUES ...',
    snippet: 'INSERT INTO ${1:table_name} (${2:column1, column2})\nVALUES (${3:value1, value2});',
    detail: 'Insert statement template',
    documentation: 'Insert a new record into a table'
  },
  {
    label: 'UPDATE ... SET ... WHERE ...',
    snippet: 'UPDATE ${1:table_name}\nSET ${2:column1} = ${3:value1}\nWHERE ${4:condition};',
    detail: 'Update statement template',
    documentation: 'Update records matching a condition'
  },
  {
    label: 'DELETE FROM ... WHERE ...',
    snippet: 'DELETE FROM ${1:table_name}\nWHERE ${2:condition};',
    detail: 'Delete statement template',
    documentation: 'Delete records matching a condition'
  },
  {
    label: 'CREATE TABLE ...',
    snippet:
      'CREATE TABLE ${1:table_name} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  ${2:name} TEXT NOT NULL\n);',
    detail: 'Create table statement template',
    documentation: 'Create a new table with an autoincrement primary key'
  },
  {
    label: 'CREATE INDEX ...',
    snippet: 'CREATE INDEX ${1:idx_name} ON ${2:table_name} (${3:column_name});',
    detail: 'Create index statement template',
    documentation: 'Create an index on one or more columns'
  }
]

export interface ParsedSqlContext {
  /** Text of current statement up to the cursor */
  textBeforeCursor: string
  /** Full text of the current statement */
  statementText: string
  /** Word currently being typed */
  currentWord: string
  /** Prefix before dot if typing `target.column` (e.g. `u` in `u.name`) */
  dotPrefix: string | null
  /** Extracted table aliases: Map of lowercase alias -> table name */
  aliases: Map<string, string>
  /** Names of tables referenced in the query */
  referencedTables: string[]
  /** Current clause the cursor is inside */
  clause:
    | 'SELECT'
    | 'FROM'
    | 'JOIN'
    | 'WHERE'
    | 'ORDER BY'
    | 'GROUP BY'
    | 'HAVING'
    | 'SET'
    | 'INTO'
    | 'ON'
    | 'NONE'
}

/**
 * Extracts the single SQL statement around the cursor offset.
 */
export function extractCurrentStatement(
  fullText: string,
  offset: number
): { statement: string; offsetInStatement: number } {
  // Split on semicolons outside of quotes
  let currentStart = 0
  let inSingleQuote = false
  let inDoubleQuote = false

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i]
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
    } else if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      if (offset <= i) {
        return {
          statement: fullText.substring(currentStart, i + 1),
          offsetInStatement: offset - currentStart
        }
      }
      currentStart = i + 1
    }
  }

  return {
    statement: fullText.substring(currentStart),
    offsetInStatement: offset - currentStart
  }
}

/**
 * Parse table references and aliases from a SQL query text.
 */
export function extractAliasesAndTables(sql: string): {
  aliases: Map<string, string>
  referencedTables: string[]
} {
  const aliases = new Map<string, string>()
  const referencedTables = new Set<string>()

  // Clean comments and strings to avoid false positives
  const sanitized = sql.replace(/--.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')

  // Avoid keywords mistakenly treated as alias (e.g. `FROM users WHERE`)
  const RESERVED_NOT_ALIAS = new Set([
    'WHERE',
    'JOIN',
    'INNER',
    'LEFT',
    'RIGHT',
    'CROSS',
    'ON',
    'USING',
    'GROUP',
    'ORDER',
    'HAVING',
    'LIMIT',
    'OFFSET',
    'SET',
    'VALUES',
    'SELECT',
    'UNION',
    'INTERSECT',
    'EXCEPT',
    'NATURAL'
  ])

  // Match FROM / JOIN / UPDATE / INTO patterns
  // Examples:
  // FROM users
  // FROM users u
  // FROM users AS u
  // FROM "users" AS u
  // JOIN orders o ON ...
  // UPDATE users u SET ...
  // INSERT INTO users ...
  const tableRefRegex =
    /\b(?:FROM|JOIN|UPDATE|INTO)\s+([a-zA-Z0-9_"]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_"]+))?/gi

  let match: RegExpExecArray | null
  while ((match = tableRefRegex.exec(sanitized)) !== null) {
    const rawTable = match[1].replace(/"/g, '')
    const rawAlias = match[2]?.replace(/"/g, '')

    referencedTables.add(rawTable)
    aliases.set(rawTable.toLowerCase(), rawTable)

    if (rawAlias && !RESERVED_NOT_ALIAS.has(rawAlias.toUpperCase())) {
      aliases.set(rawAlias.toLowerCase(), rawTable)
    }
  }

  // Also handle comma-separated table lists in FROM clause: FROM users u, orders o
  const fromClauseMatch =
    /\bFROM\s+([\s\S]+?)(?=\b(?:WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|UNION|SET|VALUES)\b|;|$)/i.exec(
      sanitized
    )
  if (fromClauseMatch) {
    const list = fromClauseMatch[1].split(',')
    for (const item of list) {
      const parts = item.trim().split(/\s+/)
      if (parts.length >= 1 && parts[0]) {
        const tbl = parts[0].replace(/"/g, '')
        if (tbl && !RESERVED_NOT_ALIAS.has(tbl.toUpperCase())) {
          referencedTables.add(tbl)
          aliases.set(tbl.toLowerCase(), tbl)
          if (
            parts.length >= 2 &&
            parts[1] &&
            parts[1].toUpperCase() !== 'AS' &&
            !RESERVED_NOT_ALIAS.has(parts[1].toUpperCase())
          ) {
            aliases.set(parts[1].replace(/"/g, '').toLowerCase(), tbl)
          } else if (
            parts.length >= 3 &&
            parts[1]?.toUpperCase() === 'AS' &&
            parts[2] &&
            !RESERVED_NOT_ALIAS.has(parts[2].toUpperCase())
          ) {
            aliases.set(parts[2].replace(/"/g, '').toLowerCase(), tbl)
          }
        }
      }
    }
  }

  return {
    aliases,
    referencedTables: Array.from(referencedTables)
  }
}

/**
 * Parse current SQL context at the cursor position.
 */
export function parseSqlContext(fullText: string, offset: number): ParsedSqlContext {
  const { statement, offsetInStatement } = extractCurrentStatement(fullText, offset)
  const textBeforeCursor = statement.substring(0, offsetInStatement)

  const { aliases, referencedTables } = extractAliasesAndTables(statement)

  // Find the word currently under or right before the cursor
  // E.g. `SELECT u.na|` -> dotPrefix: `u`, currentWord: `na`
  // E.g. `SELECT users.|` -> dotPrefix: `users`, currentWord: ``
  // E.g. `SELECT na|` -> dotPrefix: null, currentWord: `na`
  let dotPrefix: string | null = null
  let currentWord = ''

  // Look back from cursor
  const matchDot = /([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)$/.exec(textBeforeCursor)
  if (matchDot) {
    dotPrefix = matchDot[1]
    currentWord = matchDot[2]
  } else {
    const matchWord = /([a-zA-Z0-9_]+)$/.exec(textBeforeCursor)
    if (matchWord) {
      currentWord = matchWord[1]
    }
  }

  // Detect the nearest active clause before cursor
  let clause: ParsedSqlContext['clause'] = 'NONE'
  const clauseKeywords = [
    {
      pattern: /\bSELECT\b(?![\s\S]*\b(?:FROM|INSERT|UPDATE|DELETE)\b)/i,
      clause: 'SELECT' as const
    },
    {
      pattern: /\bFROM\b(?![\s\S]*\b(?:WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|JOIN)\b)/i,
      clause: 'FROM' as const
    },
    {
      pattern: /\b(?:INNER\s+|LEFT\s+|RIGHT\s+|CROSS\s+)?JOIN\b(?![\s\S]*\bON\b)/i,
      clause: 'JOIN' as const
    },
    {
      pattern: /\bON\b(?![\s\S]*\b(?:WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|JOIN)\b)/i,
      clause: 'ON' as const
    },
    {
      pattern: /\bWHERE\b(?![\s\S]*\b(?:GROUP\s+BY|ORDER\s+BY|HAVING)\b)/i,
      clause: 'WHERE' as const
    },
    {
      pattern: /\bGROUP\s+BY\b(?![\s\S]*\b(?:ORDER\s+BY|HAVING|LIMIT)\b)/i,
      clause: 'GROUP BY' as const
    },
    { pattern: /\bHAVING\b(?![\s\S]*\b(?:ORDER\s+BY|LIMIT)\b)/i, clause: 'HAVING' as const },
    { pattern: /\bORDER\s+BY\b(?![\s\S]*\bLIMIT\b)/i, clause: 'ORDER BY' as const },
    { pattern: /\bSET\b(?![\s\S]*\bWHERE\b)/i, clause: 'SET' as const },
    { pattern: /\bINTO\b(?![\s\S]*\bVALUES\b)/i, clause: 'INTO' as const }
  ]

  for (const item of clauseKeywords) {
    if (item.pattern.test(textBeforeCursor)) {
      clause = item.clause
      break
    }
  }

  return {
    textBeforeCursor,
    statementText: statement,
    currentWord,
    dotPrefix,
    aliases,
    referencedTables,
    clause
  }
}

/**
 * Format table documentation in Markdown.
 */
export function formatTableDocumentation(table: TableInfo): string {
  const lines: string[] = [
    `### 📋 Table \`${table.name}\``,
    '',
    `**Rows:** ${table.rowCount.toLocaleString()} | **Columns:** ${table.columns.length}`,
    '',
    '**Columns:**'
  ]

  for (const col of table.columns) {
    const badges: string[] = []
    if (col.pk) badges.push('🔑 `PRIMARY KEY`')
    if (col.notnull) badges.push('`NOT NULL`')
    if (col.defaultValue !== null) badges.push(`default: \`${col.defaultValue}\``)

    const badgeStr = badges.length > 0 ? ` — ${badges.join(', ')}` : ''
    lines.push(`- **\`${col.name}\`** \`${col.type}\`${badgeStr}`)
  }

  if (table.foreignKeys.length > 0) {
    lines.push('', '**Foreign Keys:**')
    for (const fk of table.foreignKeys) {
      lines.push(`- \`${fk.fromColumn}\` ➔ \`${fk.toTable}.${fk.toColumn}\``)
    }
  }

  if (table.indexes.length > 0) {
    lines.push('', '**Indexes:**')
    for (const idx of table.indexes) {
      lines.push(`- \`${idx.name}\` (${idx.columns.join(', ')})${idx.unique ? ' [UNIQUE]' : ''}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format column documentation in Markdown.
 */
export function formatColumnDocumentation(
  tableName: string,
  col: TableInfo['columns'][number],
  table?: TableInfo
): string {
  const lines: string[] = [
    `### 🔹 Column \`${tableName}.${col.name}\``,
    '',
    `- **Table:** \`${tableName}\``,
    `- **Type:** \`${col.type}\``,
    `- **Primary Key:** ${col.pk ? 'Yes 🔑' : 'No'}`,
    `- **Nullable:** ${col.notnull ? 'No (`NOT NULL`)' : 'Yes'}`,
    `- **Default Value:** ${col.defaultValue !== null ? `\`${col.defaultValue}\`` : 'None'}`
  ]

  const fk = table?.foreignKeys.find((f) => f.fromColumn === col.name)
  if (fk) {
    lines.push(`- **Foreign Key:** ➔ References \`${fk.toTable}.${fk.toColumn}\``)
  }

  return lines.join('\n')
}

/**
 * Provide completion items for Monaco editor.
 */
export function getSqlCompletions(
  schema: TableInfo[],
  fullText: string,
  offset: number,
  range: Monaco.IRange,
  monacoInstance?: typeof Monaco
): Monaco.languages.CompletionItem[] {
  const ctx = parseSqlContext(fullText, offset)
  const items: Monaco.languages.CompletionItem[] = []

  const CompletionItemKind = monacoInstance?.languages.CompletionItemKind ?? {
    Class: 5,
    Field: 3,
    Function: 1,
    Keyword: 17,
    Snippet: 27,
    Value: 11
  }

  const InsertTextRule =
    monacoInstance?.languages.CompletionItemInsertTextRule?.InsertAsSnippet ?? 4

  // Case 1: Dot navigation (e.g. `users.` or `u.`)
  if (ctx.dotPrefix) {
    const prefixLower = ctx.dotPrefix.toLowerCase()
    // Resolve alias or direct table name
    const resolvedTableName =
      ctx.aliases.get(prefixLower) ?? schema.find((t) => t.name.toLowerCase() === prefixLower)?.name

    if (resolvedTableName) {
      const table = schema.find((t) => t.name.toLowerCase() === resolvedTableName.toLowerCase())
      if (table) {
        for (const col of table.columns) {
          items.push({
            label: col.name,
            kind: CompletionItemKind.Field as Monaco.languages.CompletionItemKind,
            detail: `${table.name}.${col.name} : ${col.type}${col.pk ? ' 🔑 PK' : ''}${col.notnull ? ' NOT NULL' : ''}`,
            documentation: {
              value: formatColumnDocumentation(table.name, col, table)
            },
            insertText: col.name,
            range,
            sortText: `0_${col.name}`
          })
        }
        return items
      }
    }
  }

  // Case 2: Standard completions with context awareness

  // 2.1 Table Suggestions
  const isTablePreferredClause = ['FROM', 'JOIN', 'INTO', 'UPDATE'].includes(ctx.clause)

  for (const table of schema) {
    items.push({
      label: table.name,
      kind: CompletionItemKind.Class as Monaco.languages.CompletionItemKind,
      detail: `Table (${table.columns.length} cols, ${table.rowCount} rows)`,
      documentation: {
        value: formatTableDocumentation(table)
      },
      insertText: table.name,
      range,
      sortText: isTablePreferredClause ? `0_${table.name}` : `2_${table.name}`
    })
  }

  // 2.2 Smart FK Join Snippets
  if (ctx.clause === 'JOIN' || ctx.clause === 'FROM') {
    // If query references existing tables, check for foreign key relations to other tables
    for (const refTable of ctx.referencedTables) {
      const currentTable = schema.find((t) => t.name.toLowerCase() === refTable.toLowerCase())
      if (!currentTable) continue

      // Outgoing foreign keys (e.g. orders.user_id -> users.id)
      for (const fk of currentTable.foreignKeys) {
        const targetTable = schema.find((t) => t.name.toLowerCase() === fk.toTable.toLowerCase())
        if (targetTable && !ctx.referencedTables.includes(targetTable.name)) {
          items.push({
            label: `JOIN ${targetTable.name} ON ${currentTable.name}.${fk.fromColumn} = ${targetTable.name}.${fk.toColumn}`,
            kind: CompletionItemKind.Snippet as Monaco.languages.CompletionItemKind,
            detail: `FK Join: ${currentTable.name} ➔ ${targetTable.name}`,
            documentation: {
              value: `Smart Join based on FK:\n\`\`\`sql\nJOIN ${targetTable.name} ON ${currentTable.name}.${fk.fromColumn} = ${targetTable.name}.${fk.toColumn}\n\`\`\``
            },
            insertText: `${targetTable.name} ON ${currentTable.name}.${fk.fromColumn} = ${targetTable.name}.${fk.toColumn}`,
            range,
            sortText: `0_join_${targetTable.name}`
          })
        }
      }

      // Incoming foreign keys (e.g. users referenced by orders.user_id)
      for (const otherTable of schema) {
        if (ctx.referencedTables.includes(otherTable.name)) continue
        for (const fk of otherTable.foreignKeys) {
          if (fk.toTable.toLowerCase() === currentTable.name.toLowerCase()) {
            items.push({
              label: `JOIN ${otherTable.name} ON ${otherTable.name}.${fk.fromColumn} = ${currentTable.name}.${fk.toColumn}`,
              kind: CompletionItemKind.Snippet as Monaco.languages.CompletionItemKind,
              detail: `FK Join: ${otherTable.name} ➔ ${currentTable.name}`,
              documentation: {
                value: `Smart Join based on FK:\n\`\`\`sql\nJOIN ${otherTable.name} ON ${otherTable.name}.${fk.fromColumn} = ${currentTable.name}.${fk.toColumn}\n\`\`\``
              },
              insertText: `${otherTable.name} ON ${otherTable.name}.${fk.fromColumn} = ${currentTable.name}.${fk.toColumn}`,
              range,
              sortText: `0_join_${otherTable.name}`
            })
          }
        }
      }
    }
  }

  // 2.3 Column Suggestions
  const isColumnPreferredClause = [
    'SELECT',
    'WHERE',
    'ORDER BY',
    'GROUP BY',
    'HAVING',
    'SET',
    'ON'
  ].includes(ctx.clause)

  for (const table of schema) {
    const isReferenced = ctx.referencedTables.some(
      (ref) => ref.toLowerCase() === table.name.toLowerCase()
    )

    for (const col of table.columns) {
      // Prioritize columns from tables already referenced in the query
      let sortPriority = '3'
      if (isColumnPreferredClause && isReferenced) {
        sortPriority = '0'
      } else if (isColumnPreferredClause) {
        sortPriority = '1'
      } else if (isReferenced) {
        sortPriority = '1'
      }

      items.push({
        label: col.name,
        kind: CompletionItemKind.Field as Monaco.languages.CompletionItemKind,
        detail: `${table.name}.${col.name} : ${col.type}${col.pk ? ' 🔑 PK' : ''}`,
        documentation: {
          value: formatColumnDocumentation(table.name, col, table)
        },
        insertText: col.name,
        range,
        sortText: `${sortPriority}_${col.name}_${table.name}`
      })
    }
  }

  // 2.4 SQL Functions
  for (const fn of SQL_FUNCTIONS) {
    items.push({
      label: fn.name,
      kind: CompletionItemKind.Function as Monaco.languages.CompletionItemKind,
      detail: `${fn.signature} (${fn.category})`,
      documentation: {
        value: `### ⚡ SQLite Function \`${fn.signature}\`\n\n${fn.description}`
      },
      insertText: fn.snippet,
      insertTextRules: InsertTextRule as Monaco.languages.CompletionItemInsertTextRule,
      range,
      sortText: `4_${fn.name}`
    })
  }

  // 2.5 SQL Keywords
  for (const kw of SQL_KEYWORDS) {
    items.push({
      label: kw,
      kind: CompletionItemKind.Keyword as Monaco.languages.CompletionItemKind,
      detail: 'SQL Keyword',
      insertText: kw,
      range,
      sortText: `5_${kw}`
    })
  }

  // 2.6 SQL Snippets
  for (const snip of SQL_SNIPPETS) {
    items.push({
      label: snip.label,
      kind: CompletionItemKind.Snippet as Monaco.languages.CompletionItemKind,
      detail: snip.detail,
      documentation: {
        value: `### 📝 Snippet\n\n${snip.documentation}\n\`\`\`sql\n${snip.snippet}\n\`\`\``
      },
      insertText: snip.snippet,
      insertTextRules: InsertTextRule as Monaco.languages.CompletionItemInsertTextRule,
      range,
      sortText: `6_${snip.label}`
    })
  }

  return items
}

/**
 * Register the SQL completion item provider globally in Monaco.
 */
export function registerSqlCompletionProvider(
  monacoInstance: typeof Monaco,
  getSchema: () => TableInfo[]
): Monaco.IDisposable {
  return monacoInstance.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' ', '(', ','],
    provideCompletionItems: (model, position) => {
      const fullText = model.getValue()
      const offset = model.getOffsetAt(position)
      const wordInfo = model.getWordUntilPosition(position)

      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endColumn: wordInfo.endColumn
      }

      const schema = getSchema()
      const suggestions = getSqlCompletions(schema, fullText, offset, range, monacoInstance)

      return {
        suggestions
      }
    }
  })
}
