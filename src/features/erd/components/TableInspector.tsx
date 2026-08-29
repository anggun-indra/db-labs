import { Button, Checkbox, Drawer, Empty, Input, Popconfirm, Select, Space, Typography } from 'antd'
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { COLUMN_TYPES } from '@/features/erd/domain/schema'
import type { ColumnType } from '@/features/erd/domain/schema'
import { useErdEditorStore } from '@/stores/erdEditorStore'

const typeOptions = COLUMN_TYPES.map((type) => ({ label: type, value: type }))

/**
 * Inspector drawer for the selected table: rename, edit columns (name, type,
 * PK, nullable, unique, default), duplicate and delete (spec §7).
 */
export function TableInspector() {
  const selectedTableId = useErdEditorStore((s) => s.selectedTableId)
  const table = useErdEditorStore((s) => s.project?.tables.find((t) => t.id === s.selectedTableId))
  const selectTable = useErdEditorStore((s) => s.selectTable)
  const renameTable = useErdEditorStore((s) => s.renameTable)
  const removeTable = useErdEditorStore((s) => s.removeTable)
  const duplicateTable = useErdEditorStore((s) => s.duplicateTable)
  const addColumn = useErdEditorStore((s) => s.addColumn)
  const updateColumn = useErdEditorStore((s) => s.updateColumn)
  const removeColumn = useErdEditorStore((s) => s.removeColumn)

  const open = Boolean(selectedTableId && table)

  return (
    <Drawer
      title={
        <Space>
          <span>Table</span>
          <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
            {table?.name || '(unnamed)'}
          </Typography.Text>
        </Space>
      }
      placement="right"
      width="min(420px, 100vw)"
      style={{ maxWidth: '100vw' }}
      open={open}
      onClose={() => selectTable(null)}
      mask={false}
      styles={{ body: { paddingTop: 12 } }}
      extra={
        table && (
          <Space>
            <Button size="small" icon={<CopyOutlined />} onClick={() => duplicateTable(table.id)}>
              Duplicate
            </Button>
            <Popconfirm
              title="Delete this table?"
              description="Relationships using this table will also be removed."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => removeTable(table.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    >
      {table ? (
        <div className="table-inspector">
          <div className="table-inspector__field">
            <Typography.Text type="secondary">Table name</Typography.Text>
            <Input
              value={table.name}
              onChange={(e) => renameTable(table.id, e.target.value)}
              placeholder="e.g. customers"
            />
          </div>

          <div className="table-inspector__columns-header">
            <Typography.Text strong>Columns</Typography.Text>
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => addColumn(table.id)}
            >
              Add column
            </Button>
          </div>

          {table.columns.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No columns yet. Add the first one!"
            />
          ) : (
            table.columns.map((column, index) => (
              <div className="table-inspector__column" key={column.id}>
                <div className="table-inspector__column-row">
                  <Input
                    size="small"
                    value={column.name}
                    placeholder={`column_${index + 1}`}
                    onChange={(e) => updateColumn(table.id, column.id, { name: e.target.value })}
                    aria-label={`Column ${index + 1} name`}
                  />
                  <Select
                    size="small"
                    value={column.type}
                    options={typeOptions}
                    onChange={(value) =>
                      updateColumn(table.id, column.id, { type: value as ColumnType })
                    }
                    className="table-inspector__type"
                    aria-label={`Column ${index + 1} type`}
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeColumn(table.id, column.id)}
                    aria-label={`Delete column ${column.name || index + 1}`}
                  />
                </div>
                <div className="table-inspector__column-row table-inspector__column-flags">
                  <Checkbox
                    checked={column.primaryKey}
                    onChange={(e) =>
                      updateColumn(table.id, column.id, {
                        primaryKey: e.target.checked,
                        // A primary key can never be NULL.
                        nullable: e.target.checked ? false : column.nullable
                      })
                    }
                  >
                    PK
                  </Checkbox>
                  <Checkbox
                    checked={!column.nullable}
                    disabled={column.primaryKey}
                    onChange={(e) =>
                      updateColumn(table.id, column.id, { nullable: !e.target.checked })
                    }
                  >
                    NOT NULL
                  </Checkbox>
                  <Checkbox
                    checked={column.unique}
                    disabled={column.primaryKey}
                    onChange={(e) =>
                      updateColumn(table.id, column.id, { unique: e.target.checked })
                    }
                  >
                    UNIQUE
                  </Checkbox>
                </div>
                <Input
                  size="small"
                  value={column.defaultValue ?? ''}
                  placeholder="Default value (optional)"
                  onChange={(e) =>
                    updateColumn(table.id, column.id, {
                      defaultValue: e.target.value === '' ? undefined : e.target.value
                    })
                  }
                  aria-label={`Column ${index + 1} default value`}
                />
              </div>
            ))
          )}

          <Typography.Paragraph type="secondary" className="table-inspector__hint">
            Tip: tick PK on one or more columns to make a (composite) primary key. Drag from a
            column handle to another table&apos;s column to create a relationship.
          </Typography.Paragraph>
        </div>
      ) : null}
    </Drawer>
  )
}
