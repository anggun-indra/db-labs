import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { TableNode } from './TableNode'
import type { TableFlowNode } from './flowAdapter'
import { createColumn, createTable } from '@/features/erd/domain/factory'

function renderNode(data: TableFlowNode['data'], selected = false) {
  const props = {
    id: 'node-1',
    data,
    selected,
    dragging: false,
    type: 'table',
    positionAbsolute: { x: 0, y: 0 },
    zIndex: 0,
    isConnectable: true,
    deletable: true,
    selectable: true,
    draggingInternally: false
  } as unknown as NodeProps<TableFlowNode>
  return render(
    <ReactFlowProvider>
      <TableNode {...props} />
    </ReactFlowProvider>
  )
}

describe('TableNode', () => {
  it('renders the table name and its columns with types', () => {
    const table = createTable('customers', { x: 0, y: 0 }, [
      createColumn({ id: 'c1', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false }),
      createColumn({ id: 'c2', name: 'email', type: 'TEXT', unique: true, nullable: false })
    ])
    renderNode({ table, fkColumnIds: [] })

    expect(screen.getByTestId('table-node-header')).toHaveTextContent('customers')
    expect(screen.getByTestId('column-row-c1')).toHaveTextContent('id')
    expect(screen.getByTestId('column-row-c1')).toHaveTextContent('INTEGER')
    expect(screen.getByTestId('column-row-c2')).toHaveTextContent('email')
    expect(screen.getByTestId('column-row-c2')).toHaveTextContent('TEXT')
  })

  it('marks nullable columns with a question mark on the type', () => {
    const table = createTable('t', { x: 0, y: 0 }, [
      createColumn({ id: 'c1', name: 'notes', type: 'TEXT', nullable: true })
    ])
    renderNode({ table, fkColumnIds: [] })
    expect(screen.getByTestId('column-row-c1')).toHaveTextContent('TEXT?')
  })

  it('shows a placeholder for unnamed tables', () => {
    const table = createTable('', { x: 0, y: 0 })
    renderNode({ table, fkColumnIds: [] })
    expect(screen.getByTestId('table-node-header')).toHaveTextContent('(unnamed table)')
  })

  it('shows an empty hint when the table has no columns', () => {
    const table = createTable('empty', { x: 0, y: 0 }, [])
    renderNode({ table, fkColumnIds: [] })
    expect(screen.getByText('no columns yet')).toBeInTheDocument()
  })
})
