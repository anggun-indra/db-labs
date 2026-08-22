import type { Edge, Node } from '@xyflow/react'
import {
  cardinalityLabel,
  foreignKeySide,
  resolveRelationshipEndpoints
} from '@/features/erd/domain/factory'
import type { ErdRelationship, ErdProject, ErdTable } from '@/features/erd/domain/schema'

/**
 * Adapters between the ERD domain model and React Flow canvas state
 * (spec §10: keep the ERD JSON independent from React Flow internals).
 */

export interface TableNodeData extends Record<string, unknown> {
  table: ErdTable
  /** Column ids that act as the FK side of some relationship. */
  fkColumnIds: string[]
}

export type TableFlowNode = Node<TableNodeData, 'table'>

export interface RelationshipEdgeData extends Record<string, unknown> {
  relationship: ErdRelationship
}

export type RelationshipFlowEdge = Edge<RelationshipEdgeData>

function fkColumnIdsForTable(tableId: string, relationships: ErdRelationship[]): string[] {
  const ids: string[] = []
  for (const relationship of relationships) {
    const side = foreignKeySide(relationship)
    if (side === 'source' && relationship.sourceTableId === tableId) {
      ids.push(relationship.sourceColumnId)
    } else if (side === 'target' && relationship.targetTableId === tableId) {
      ids.push(relationship.targetColumnId)
    }
  }
  return ids
}

export function tablesToNodes(
  project: Pick<ErdProject, 'tables' | 'relationships'>,
  previous: TableFlowNode[] = []
): TableFlowNode[] {
  const previousById = new Map(previous.map((node) => [node.id, node]))
  return project.tables.map((table) => {
    const existing = previousById.get(table.id)
    return {
      id: table.id,
      type: 'table' as const,
      // Positions live in the domain model; React Flow changes are written
      // back to the store by ErdCanvas.
      position: table.position,
      data: {
        table,
        fkColumnIds: fkColumnIdsForTable(table.id, project.relationships)
      },
      selected: existing?.selected ?? false
    }
  })
}

export function relationshipsToEdges(project: ErdProject): RelationshipFlowEdge[] {
  return project.relationships.map((relationship) => {
    const endpoints = resolveRelationshipEndpoints(relationship, project.tables)
    const label = endpoints
      ? `${cardinalityLabel(relationship.cardinality)}  ${endpoints.fkTable.name}.${endpoints.fkColumn.name} → ${endpoints.referencedTable.name}.${endpoints.referencedColumn.name}`
      : `${cardinalityLabel(relationship.cardinality)}  (broken reference)`

    return {
      id: relationship.id,
      source: relationship.sourceTableId,
      target: relationship.targetTableId,
      sourceHandle: relationship.sourceColumnId,
      targetHandle: relationship.targetColumnId,
      type: 'default',
      label,
      data: { relationship }
    }
  })
}
