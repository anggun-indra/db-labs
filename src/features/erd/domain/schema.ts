import { z } from 'zod'

/**
 * Versioned ERD domain schema (spec §10).
 *
 * The ERD JSON is deliberately independent from React Flow's internal schema;
 * adapters in `features/erd/components/flowAdapter.ts` translate between the
 * two. When this schema changes, bump ERD_SCHEMA_VERSION and add a migration
 * in `migrate.ts`.
 */

export const ERD_SCHEMA_VERSION = 1

/** Teaching-oriented SQL types mapped to SQLite affinities (spec §7). */
export const COLUMN_TYPES = [
  'INTEGER',
  'REAL',
  'TEXT',
  'BLOB',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  'NUMERIC'
] as const

export type ColumnType = (typeof COLUMN_TYPES)[number]

/**
 * Relationship cardinality as drawn from source -> target (spec §8, §10).
 *
 * Foreign-key side convention (documented in ERD-SCHEMA.md):
 * - many-to-one : the SOURCE table holds the FK referencing the target
 * - one-to-many : the TARGET table holds the FK referencing the source
 * - one-to-one  : the SOURCE table holds the FK referencing the target
 *
 * Many-to-many is intentionally NOT stored as an executable relationship;
 * it must be resolved through an explicit junction table (spec §8).
 */
export const CARDINALITIES = ['one-to-one', 'one-to-many', 'many-to-one'] as const

export type Cardinality = (typeof CARDINALITIES)[number]

export const positionSchema = z.object({
  x: z.number(),
  y: z.number()
})

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number()
})

export const erdColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(COLUMN_TYPES),
  primaryKey: z.boolean(),
  nullable: z.boolean(),
  unique: z.boolean(),
  defaultValue: z.string().optional()
})

export const erdTableSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: positionSchema,
  columns: z.array(erdColumnSchema)
})

export const erdRelationshipSchema = z.object({
  id: z.string().min(1),
  sourceTableId: z.string().min(1),
  sourceColumnId: z.string().min(1),
  targetTableId: z.string().min(1),
  targetColumnId: z.string().min(1),
  cardinality: z.enum(CARDINALITIES)
})

export const erdProjectSchema = z.object({
  schemaVersion: z.literal(ERD_SCHEMA_VERSION),
  projectId: z.string().min(1),
  name: z.string(),
  tables: z.array(erdTableSchema),
  relationships: z.array(erdRelationshipSchema),
  viewport: viewportSchema.optional()
})

export type Position = z.infer<typeof positionSchema>
export type Viewport = z.infer<typeof viewportSchema>
export type ErdColumn = z.infer<typeof erdColumnSchema>
export type ErdTable = z.infer<typeof erdTableSchema>
export type ErdRelationship = z.infer<typeof erdRelationshipSchema>
export type ErdProject = z.infer<typeof erdProjectSchema>

/** Validation output shape required by spec §9. */
export interface ValidationIssue {
  id: string
  severity: 'error' | 'warning' | 'info'
  entityType: 'table' | 'column' | 'relationship'
  entityId: string
  code: string
  message: string
}
