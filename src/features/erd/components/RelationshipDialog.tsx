import { useMemo, useState } from 'react'
import { Alert, Modal, Radio, Space, Typography } from 'antd'
import { useErdEditorStore } from '@/stores/erdEditorStore'
import type { Cardinality } from '@/features/erd/domain/schema'

interface EndpointInfo {
  tableName: string
  columnName: string
}

function describeEndpoint(
  tables: { id: string; name: string; columns: { id: string; name: string }[] }[],
  tableId: string,
  columnId: string
): EndpointInfo {
  const table = tables.find((t) => t.id === tableId)
  const column = table?.columns.find((c) => c.id === columnId)
  return {
    tableName: table?.name || '(missing table)',
    columnName: column?.name || '(missing column)'
  }
}

/**
 * Dialog shown after connecting two columns. The student picks the
 * cardinality; the FK side is derived and explained (spec §8, §50:
 * never hide database concepts).
 */
export function RelationshipDialog() {
  const pending = useErdEditorStore((s) => s.pendingConnection)
  const tables = useErdEditorStore((s) => s.project?.tables ?? [])
  const setPendingConnection = useErdEditorStore((s) => s.setPendingConnection)
  const addRelationship = useErdEditorStore((s) => s.addRelationship)
  const [cardinality, setCardinality] = useState<Cardinality>('many-to-one')

  const source = useMemo(
    () =>
      pending ? describeEndpoint(tables, pending.sourceTableId, pending.sourceColumnId) : null,
    [pending, tables]
  )
  const target = useMemo(
    () =>
      pending ? describeEndpoint(tables, pending.targetTableId, pending.targetColumnId) : null,
    [pending, tables]
  )

  const explanation = useMemo(() => {
    if (!pending || !source || !target) return ''
    if (cardinality === 'many-to-one') {
      return `The many side keeps the foreign key: ${source.tableName}.${source.columnName} will reference ${target.tableName}.${target.columnName}.`
    }
    if (cardinality === 'one-to-many') {
      return `The many side keeps the foreign key: ${target.tableName}.${target.columnName} will reference ${source.tableName}.${source.columnName}.`
    }
    return `One-to-one: ${source.tableName}.${source.columnName} will reference ${target.tableName}.${target.columnName} (the FK lives on the left side by convention).`
  }, [pending, source, target, cardinality])

  if (!pending || !source || !target) return null

  return (
    <Modal
      title="Create relationship"
      open
      okText="Create relationship"
      cancelText="Cancel"
      onCancel={() => setPendingConnection(null)}
      onOk={() => {
        addRelationship({
          sourceTableId: pending.sourceTableId,
          sourceColumnId: pending.sourceColumnId,
          targetTableId: pending.targetTableId,
          targetColumnId: pending.targetColumnId,
          cardinality
        })
        setPendingConnection(null)
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>
          <Typography.Text code>
            {source.tableName}.{source.columnName}
          </Typography.Text>{' '}
          ⟶{' '}
          <Typography.Text code>
            {target.tableName}.{target.columnName}
          </Typography.Text>
        </Typography.Text>

        <Radio.Group
          value={cardinality}
          onChange={(e) => setCardinality(e.target.value as Cardinality)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="many-to-one">Many-to-one (N:1)</Radio.Button>
          <Radio.Button value="one-to-many">One-to-many (1:N)</Radio.Button>
          <Radio.Button value="one-to-one">One-to-one (1:1)</Radio.Button>
        </Radio.Group>

        <Alert type="info" showIcon message={explanation} />

        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
          Many-to-many? It needs a junction table (e.g. STUDENT_COURSE). Create the junction table
          first, then connect it with two one-to-many relationships — that is how relational
          databases model M:N.
        </Typography.Paragraph>
      </Space>
    </Modal>
  )
}
