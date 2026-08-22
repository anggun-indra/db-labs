/**
 * Rule-based educational hints for common SQLite errors (spec §15).
 * No LLM involved; each rule maps a raw error pattern to a friendly hint.
 */

export interface ErrorExplanation {
  code: string
  hint: string
}

interface HintRule {
  code: string
  pattern: RegExp
  hint: (match: RegExpMatchArray) => string
}

const RULES: HintRule[] = [
  {
    code: 'NO_SUCH_TABLE',
    pattern: /no such table: (.+)/i,
    hint: (m) =>
      `The table "${m[1]}" does not exist in this database. Check the spelling, or generate/rebuild the database from your ERD first.`
  },
  {
    code: 'NO_SUCH_COLUMN',
    pattern: /no such column: (.+)/i,
    hint: (m) =>
      `The column "${m[1]}" could not be found. Check the column spelling and the table it belongs to (table names and column names are separate).`
  },
  {
    code: 'TABLE_ALREADY_EXISTS',
    pattern: /table (.+) already exists/i,
    hint: (m) => `The table "${m[1]}" already exists. Use DROP TABLE first, or pick another name.`
  },
  {
    code: 'SYNTAX_ERROR',
    pattern: /near "(.+)": syntax error/i,
    hint: (m) =>
      `SQLite got confused near "${m[1]}". Check for missing commas, quotes, or keywords around that spot.`
  },
  {
    code: 'UNIQUE_CONSTRAINT',
    pattern: /UNIQUE constraint failed: (.+)/i,
    hint: (m) =>
      `A UNIQUE rule was violated on ${m[1]}. That value already exists in a column (or column set) that must stay unique.`
  },
  {
    code: 'NOT_NULL_CONSTRAINT',
    pattern: /NOT NULL constraint failed: (.+)/i,
    hint: (m) => `Column ${m[1]} does not allow NULL. Provide a value for it.`
  },
  {
    code: 'FOREIGN_KEY_CONSTRAINT',
    pattern: /FOREIGN KEY constraint failed/i,
    hint: () =>
      'A foreign key rule was violated. The referenced row does not exist (INSERT/UPDATE), or rows still reference it (DELETE/UPDATE). Check the parent table first.'
  },
  {
    code: 'CHECK_CONSTRAINT',
    pattern: /CHECK constraint failed: (.+)/i,
    hint: (m) => `A CHECK rule on ${m[1]} rejected the value.`
  },
  {
    code: 'PRIMARY_KEY_CONSTRAINT',
    pattern: /PRIMARY KEY constraint failed/i,
    hint: () => 'A primary key value must be unique. That key already exists in the table.'
  },
  {
    code: 'AMBIGUOUS_COLUMN',
    pattern: /ambiguous column name: (.+)/i,
    hint: (m) =>
      `Column "${m[1]}" exists in more than one joined table. Prefix it with the table name or alias, e.g. customers.${m[1]}.`
  },
  {
    code: 'WRONG_COLUMN_COUNT',
    pattern: /(\d+) values for (\d+) columns/i,
    hint: (m) =>
      `The INSERT provides ${m[1]} values but the table/column list expects ${m[2]}. Make them match.`
  }
]

export function explainSqliteError(rawMessage: string): ErrorExplanation | null {
  for (const rule of RULES) {
    const match = rawMessage.match(rule.pattern)
    if (match) {
      return { code: rule.code, hint: rule.hint(match) }
    }
  }
  return null
}
