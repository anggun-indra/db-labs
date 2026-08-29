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
      `The table "${m[1]}" does not exist in this database. Check the table spelling in the Schema panel on the left, or generate/rebuild the database from your ERD first.`
  },
  {
    code: 'NO_SUCH_COLUMN',
    pattern: /no such column: (.+)/i,
    hint: (m) =>
      `The column "${m[1]}" could not be found. Check the column spelling and verify which table it belongs to in the Schema panel.`
  },
  {
    code: 'NO_SUCH_COLUMN_IN_TABLE',
    pattern: /table (.+) has no column named (.+)/i,
    hint: (m) =>
      `Table "${m[1]}" does not have a column named "${m[2]}". Check your table definition and target column list in your statement.`
  },
  {
    code: 'WRONG_COLUMN_COUNT',
    pattern: /(\d+) values for (\d+) columns/i,
    hint: (m) =>
      `The INSERT statement provides ${m[1]} values but lists ${m[2]} target columns. The number of values must match the number of columns.`
  },
  {
    code: 'WRONG_COLUMN_COUNT',
    pattern: /table (.+) has (\d+) columns but (\d+) values were supplied/i,
    hint: (m) =>
      `Table "${m[1]}" has ${m[2]} columns, but your INSERT statement supplied ${m[3]} values without specifying a column list. Explicitly specify target columns: INSERT INTO ${m[1]} (col1, col2, ...) VALUES (...).`
  },
  {
    code: 'NOT_NULL_CONSTRAINT',
    pattern: /NOT NULL constraint failed: (.+)/i,
    hint: (m) =>
      `Column ${m[1]} has a NOT NULL constraint and cannot be empty or NULL. Provide a valid non-null value for it in your INSERT or UPDATE statement.`
  },
  {
    code: 'UNIQUE_CONSTRAINT',
    pattern: /UNIQUE constraint failed: (.+)/i,
    hint: (m) =>
      `A UNIQUE constraint was violated on ${m[1]}. A record with that value already exists in the database. Use a different value or update the existing row.`
  },
  {
    code: 'PRIMARY_KEY_CONSTRAINT',
    pattern: /PRIMARY KEY (?:must be unique|constraint failed)/i,
    hint: () =>
      'A PRIMARY KEY constraint failed. Primary key values must be unique and non-null for each row. Ensure you are not inserting a duplicate ID.'
  },
  {
    code: 'FOREIGN_KEY_CONSTRAINT',
    pattern: /FOREIGN KEY constraint failed/i,
    hint: () =>
      'A FOREIGN KEY constraint was violated. The referenced parent record does not exist (on INSERT/UPDATE), or other rows still reference this row (on DELETE/UPDATE). Insert the parent row first or verify foreign key IDs.'
  },
  {
    code: 'CHECK_CONSTRAINT',
    pattern: /CHECK constraint failed: (.+)/i,
    hint: (m) =>
      `A CHECK constraint on ${m[1]} failed. The inserted or updated value does not satisfy the table's validation rule.`
  },
  {
    code: 'DATATYPE_MISMATCH',
    pattern: /datatype mismatch/i,
    hint: () =>
      "A data type mismatch occurred. Verify that numeric fields receive numbers, string fields are quoted with single quotes '...', and date formats match."
  },
  {
    code: 'SYNTAX_ERROR',
    pattern: /near "(.+)": syntax error/i,
    hint: (m) =>
      `SQLite syntax error near "${m[1]}". Check for missing commas, mismatched parentheses, unclosed quotes, or misspelled SQL keywords.`
  },
  {
    code: 'UNRECOGNIZED_TOKEN',
    pattern: /unrecognized token: "(.+)"/i,
    hint: (m) =>
      `Unrecognized token "${m[1]}". Check for invalid special characters or unclosed quotation marks.`
  },
  {
    code: 'INCOMPLETE_INPUT',
    pattern: /incomplete input/i,
    hint: () =>
      'The SQL statement is incomplete. Check for missing closing parentheses ")", unclosed quotation marks, or incomplete clauses.'
  },
  {
    code: 'NO_SUCH_FUNCTION',
    pattern: /no such function: (.+)/i,
    hint: (m) =>
      `Function "${m[1]}()" is not recognized by SQLite. Check the function name spelling or refer to supported SQLite functions.`
  },
  {
    code: 'MISUSE_OF_AGGREGATE',
    pattern: /misuse of aggregate/i,
    hint: () =>
      'Aggregate functions (like COUNT, SUM, AVG, MIN, MAX) cannot be used in a WHERE clause directly. Use a subquery or a HAVING clause instead.'
  },
  {
    code: 'AMBIGUOUS_COLUMN',
    pattern: /ambiguous column name: (.+)/i,
    hint: (m) =>
      `Column "${m[1]}" exists in more than one joined table. Prefix the column name with the table name or alias (e.g. customers.${m[1]} or c.${m[1]}).`
  },
  {
    code: 'TABLE_ALREADY_EXISTS',
    pattern: /table (.+) already exists/i,
    hint: (m) =>
      `The table "${m[1]}" already exists in this database. Use CREATE TABLE IF NOT EXISTS, drop the existing table first, or choose a different name.`
  },
  {
    code: 'INDEX_ALREADY_EXISTS',
    pattern: /index (.+) already exists/i,
    hint: (m) =>
      `Index "${m[1]}" already exists. Drop the existing index or choose a different index name.`
  },
  {
    code: 'VIEW_ALREADY_EXISTS',
    pattern: /view (.+) already exists/i,
    hint: (m) =>
      `View "${m[1]}" already exists. Drop the existing view or choose a different view name.`
  },
  {
    code: 'CANNOT_MODIFY_VIEW',
    pattern: /cannot modify (.+) because it is a view/i,
    hint: (m) =>
      `View "${m[1]}" is read-only. Data modifications (INSERT, UPDATE, DELETE) must be executed on the underlying base tables.`
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
