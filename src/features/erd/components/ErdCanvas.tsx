import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnMoveEnd
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useErdEditorStore } from '@/stores/erdEditorStore'
import { TableNode } from './TableNode'
import {
  relationshipsToEdges,
  tablesToNodes,
  type RelationshipFlowEdge,
  type TableFlowNode
} from './flowAdapter'

const nodeTypes = { table: TableNode }

const EMPTY_TABLES: never[] = []
const EMPTY_RELATIONSHIPS: never[] = []

/**
 * The ERD canvas. Nodes/edges are derived from the domain model in the store;
 * React Flow changes are translated back into store updates (spec §10).
 */
export function ErdCanvas() {
  const tables = useErdEditorStore((s) => s.project?.tables ?? EMPTY_TABLES)
  const relationships = useErdEditorStore((s) => s.project?.relationships ?? EMPTY_RELATIONSHIPS)
  const viewport = useErdEditorStore((s) => s.project?.viewport)
  const moveTable = useErdEditorStore((s) => s.moveTable)
  const endGesture = useErdEditorStore((s) => s.endGesture)
  const removeTable = useErdEditorStore((s) => s.removeTable)
  const removeRelationship = useErdEditorStore((s) => s.removeRelationship)
  const selectTable = useErdEditorStore((s) => s.selectTable)
  const selectRelationship = useErdEditorStore((s) => s.selectRelationship)
  const setPendingConnection = useErdEditorStore((s) => s.setPendingConnection)
  const setViewport = useErdEditorStore((s) => s.setViewport)

  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipFlowEdge>([])

  // Rebuild nodes only when the structure changes (not on position updates;
  // those are already mirrored into the store during drags).
  const structuralKey = useMemo(
    () =>
      tables
        .map(
          (t) =>
            `${t.id}|${t.name}|${t.columns
              .map((c) => [c.id, c.name, c.type, c.primaryKey, c.nullable, c.unique].join('~'))
              .join(',')}`
        )
        .join(';'),
    [tables]
  )

  const relationshipKey = useMemo(
    () =>
      relationships
        .map((r) =>
          [
            r.id,
            r.sourceTableId,
            r.sourceColumnId,
            r.targetTableId,
            r.targetColumnId,
            r.cardinality
          ].join('~')
        )
        .join(';'),
    [relationships]
  )

  // Keep latest tables/relationships available to effects without re-running
  // them on position-only changes.
  const tablesRef = useRef(tables)
  tablesRef.current = tables
  const relationshipsRef = useRef(relationships)
  relationshipsRef.current = relationships

  useEffect(() => {
    setNodes((prev) =>
      tablesToNodes({ tables: tablesRef.current, relationships: relationshipsRef.current }, prev)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey])

  useEffect(() => {
    setEdges(
      relationshipsToEdges({
        schemaVersion: 1,
        projectId: 'canvas',
        name: 'canvas',
        tables: tablesRef.current,
        relationships: relationshipsRef.current
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationshipKey, structuralKey])

  const handleNodesChange = useCallback(
    (changes: NodeChange<TableFlowNode>[]) => {
      onNodesChange(changes)
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          moveTable(change.id, change.position, change.dragging === true)
        } else if (change.type === 'select') {
          if (change.selected) selectTable(change.id)
          else selectTable(null)
        } else if (change.type === 'remove') {
          removeTable(change.id)
        }
      }
    },
    [onNodesChange, moveTable, selectTable, removeTable]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<RelationshipFlowEdge>[]) => {
      onEdgesChange(changes)
      for (const change of changes) {
        if (change.type === 'select') {
          if (change.selected) selectRelationship(change.id)
          else selectRelationship(null)
        } else if (change.type === 'remove') {
          removeRelationship(change.id)
        }
      }
    },
    [onEdgesChange, selectRelationship, removeRelationship]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle ||
        !connection.targetHandle
      ) {
        return
      }
      if (connection.source === connection.target) {
        // Self-referencing FKs are an advanced topic; keep Phase 1 explicit.
        return
      }
      setPendingConnection({
        sourceTableId: connection.source,
        sourceColumnId: connection.sourceHandle,
        targetTableId: connection.target,
        targetColumnId: connection.targetHandle
      })
    },
    [setPendingConnection]
  )

  const handleMoveEnd = useCallback<OnMoveEnd>(
    (_event, vp) => {
      setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom })
    },
    [setViewport]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onNodeDragStop={endGesture}
      onMoveEnd={handleMoveEnd}
      defaultViewport={viewport ?? { x: 0, y: 0, zoom: 1 }}
      minZoom={0.2}
      maxZoom={2}
      deleteKeyCode={['Backspace', 'Delete']}
      fitView={false}
      proOptions={{ hideAttribution: true }}
      className="erd-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="var(--dsw-erd-grid)" />
      <Controls position="bottom-right" />
      <MiniMap pannable zoomable position="top-right" />
    </ReactFlow>
  )
}
