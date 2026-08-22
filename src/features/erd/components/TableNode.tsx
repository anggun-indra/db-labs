import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { KeyOutlined, LinkOutlined } from '@ant-design/icons'
import type { TableFlowNode } from './flowAdapter'

/**
 * A single ERD table node. Purely presentational: all data arrives through
 * node data; interactions happen through React Flow events + the editor store.
 *
 * Each column row exposes a target handle (left) and a source handle (right)
 * so students can connect any column pair.
 */
function TableNodeComponent({ data, selected }: NodeProps<TableFlowNode>) {
  const { table, fkColumnIds } = data
  const fkSet = new Set(fkColumnIds)

  return (
    <div className={`erd-table-node${selected ? ' erd-table-node--selected' : ''}`}>
      <div className="erd-table-node__header" data-testid="table-node-header">
        {table.name.trim() || <span className="erd-table-node__placeholder">(unnamed table)</span>}
      </div>
      {table.columns.length === 0 ? (
        <div className="erd-table-node__empty">no columns yet</div>
      ) : (
        table.columns.map((column) => (
          <div
            className="erd-table-node__row"
            key={column.id}
            data-testid={`column-row-${column.id}`}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={column.id}
              className="erd-table-node__handle"
            />
            <span className="erd-table-node__badges">
              {column.primaryKey && <KeyOutlined title="Primary key" />}
              {fkSet.has(column.id) && <LinkOutlined title="Foreign key" />}
              {column.unique && !column.primaryKey && (
                <span className="erd-table-node__uq">UQ</span>
              )}
            </span>
            <span
              className={`erd-table-node__column-name${column.name ? '' : ' erd-table-node__placeholder'}`}
            >
              {column.name || '(unnamed)'}
            </span>
            <span className="erd-table-node__column-type">
              {column.type}
              {column.nullable && !column.primaryKey ? '?' : ''}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={column.id}
              className="erd-table-node__handle"
            />
          </div>
        ))
      )}
    </div>
  )
}

export const TableNode = memo(TableNodeComponent)
