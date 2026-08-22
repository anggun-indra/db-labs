import { describe, expect, it } from 'vitest'
import {
  cardinalityLabel,
  createColumn,
  createPrimaryKeyColumn,
  createProject,
  createTable,
  duplicateTable,
  foreignKeySide,
  newId,
  resolveRelationshipEndpoints,
  typesCompatible
} from './factory'
import { ERD_SCHEMA_VERSION, type ErdRelationship } from './schema'

describe('factory', () => {
  it('creates unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId()))
    expect(ids.size).toBe(500)
  })

  it('creates projects on schema version 1 with empty tables', () => {
    const project = createProject('Demo')
    expect(project.schemaVersion).toBe(ERD_SCHEMA_VERSION)
    expect(project.name).toBe('Demo')
    expect(project.tables).toEqual([])
    expect(project.relationships).toEqual([])
    expect(project.projectId).toBeTruthy()
  })

  it('creates tables with a default INTEGER primary key column', () => {
    const table = createTable('customers', { x: 10, y: 20 })
    expect(table.name).toBe('customers')
    expect(table.position).toEqual({ x: 10, y: 20 })
    expect(table.columns).toHaveLength(1)
    expect(table.columns[0]).toMatchObject({
      name: 'id',
      type: 'INTEGER',
      primaryKey: true,
      nullable: false
    })
  })

  it('createPrimaryKeyColumn defaults', () => {
    expect(createPrimaryKeyColumn()).toMatchObject({ name: 'id', primaryKey: true })
  })

  it('duplicateTable deep-copies columns with fresh ids and offset position', () => {
    const original = createTable('orders', { x: 0, y: 0 }, [
      createColumn({ name: 'id', primaryKey: true, nullable: false }),
      createColumn({ name: 'total', type: 'REAL' })
    ])
    const copy = duplicateTable(original)
    expect(copy.id).not.toBe(original.id)
    expect(copy.name).toBe('orders_copy')
    expect(copy.position).toEqual({ x: 40, y: 40 })
    expect(copy.columns.map((c) => c.name)).toEqual(['id', 'total'])
    expect(copy.columns[0].id).not.toBe(original.columns[0].id)
    // mutating the copy must not affect the original
    copy.columns[0].name = 'changed'
    expect(original.columns[0].name).toBe('id')
  })

  it('foreignKeySide follows the documented convention', () => {
    const base: Omit<ErdRelationship, 'cardinality'> = {
      id: 'r',
      sourceTableId: 'a',
      sourceColumnId: 'ca',
      targetTableId: 'b',
      targetColumnId: 'cb'
    }
    expect(foreignKeySide({ ...base, cardinality: 'many-to-one' })).toBe('source')
    expect(foreignKeySide({ ...base, cardinality: 'one-to-many' })).toBe('target')
    expect(foreignKeySide({ ...base, cardinality: 'one-to-one' })).toBe('source')
  })

  it('cardinalityLabel renders compact labels', () => {
    expect(cardinalityLabel('one-to-one')).toBe('1:1')
    expect(cardinalityLabel('one-to-many')).toBe('1:N')
    expect(cardinalityLabel('many-to-one')).toBe('N:1')
  })

  it('resolveRelationshipEndpoints returns null for orphan relationships', () => {
    const tables = [createTable('a', { x: 0, y: 0 })]
    const rel: ErdRelationship = {
      id: 'r',
      sourceTableId: tables[0].id,
      sourceColumnId: 'missing',
      targetTableId: 'missing-table',
      targetColumnId: 'x',
      cardinality: 'many-to-one'
    }
    expect(resolveRelationshipEndpoints(rel, tables)).toBeNull()
  })

  it('type compatibility allows numeric-like matches', () => {
    expect(typesCompatible('INTEGER', 'INTEGER')).toBe(true)
    expect(typesCompatible('INTEGER', 'NUMERIC')).toBe(true)
    expect(typesCompatible('TEXT', 'TEXT')).toBe(true)
    expect(typesCompatible('TEXT', 'INTEGER')).toBe(false)
    expect(typesCompatible('DATE', 'DATETIME')).toBe(false)
  })
})
