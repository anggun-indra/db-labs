import { describe, expect, it } from 'vitest'
import { relationshipsToEdges, tablesToNodes } from './flowAdapter'
import { createColumn, createProject, createTable } from '@/features/erd/domain/factory'
import type { ErdProject } from '@/features/erd/domain/schema'

function makeProject(): ErdProject {
  const customers = createTable('customers', { x: 0, y: 0 }, [
    createColumn({
      id: 'c-cust-pk',
      name: 'id',
      type: 'INTEGER',
      primaryKey: true,
      nullable: false
    })
  ])
  const orders = createTable('orders', { x: 300, y: 0 }, [
    createColumn({
      id: 'c-ord-pk',
      name: 'id',
      type: 'INTEGER',
      primaryKey: true,
      nullable: false
    }),
    createColumn({ id: 'c-ord-cust', name: 'customer_id', type: 'INTEGER', nullable: false })
  ])
  return {
    ...createProject('Adapter Test'),
    tables: [customers, orders],
    relationships: [
      {
        id: 'rel-1',
        sourceTableId: orders.id,
        sourceColumnId: 'c-ord-cust',
        targetTableId: customers.id,
        targetColumnId: 'c-cust-pk',
        cardinality: 'many-to-one'
      }
    ]
  }
}

describe('flowAdapter', () => {
  it('maps every table to a node with domain position and FK info', () => {
    const project = makeProject()
    const nodes = tablesToNodes(project)

    expect(nodes).toHaveLength(2)
    const ordersNode = nodes.find((n) => n.data.table.name === 'orders')!
    expect(ordersNode.type).toBe('table')
    expect(ordersNode.position).toEqual({ x: 300, y: 0 })
    // FK side of many-to-one is the source table (orders.customer_id).
    expect(ordersNode.data.fkColumnIds).toEqual(['c-ord-cust'])

    const customersNode = nodes.find((n) => n.data.table.name === 'customers')!
    expect(customersNode.data.fkColumnIds).toEqual([])
  })

  it('preserves selection state from previous nodes', () => {
    const project = makeProject()
    const previous = tablesToNodes(project)
    previous[0].selected = true

    const next = tablesToNodes(project, previous)
    expect(next[0].selected).toBe(true)
    expect(next[1].selected).toBe(false)
  })

  it('maps relationships to edges with readable labels', () => {
    const project = makeProject()
    const edges = relationshipsToEdges(project)

    expect(edges).toHaveLength(1)
    const edge = edges[0]
    expect(edge.id).toBe('rel-1')
    expect(edge.sourceHandle).toBe('c-ord-cust')
    expect(edge.targetHandle).toBe('c-cust-pk')
    expect(edge.label).toContain('N:1')
    expect(edge.label).toContain('orders.customer_id')
    expect(edge.label).toContain('customers.id')
  })

  it('labels orphan relationships as broken instead of crashing', () => {
    const project = makeProject()
    project.relationships[0] = { ...project.relationships[0], targetTableId: 'ghost' }
    const edges = relationshipsToEdges(project)
    expect(edges[0].label).toContain('broken reference')
  })
})
