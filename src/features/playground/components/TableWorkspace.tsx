import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd'
import {
  CodeOutlined,
  CopyOutlined,
  DatabaseOutlined,
  KeyOutlined,
  TableOutlined
} from '@ant-design/icons'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'
import { VisualDataEditor } from './VisualDataEditor'

interface TableWorkspaceProps {
  schema: TableInfo[]
  selectedTable: string | null
  onSelectTable: (name: string) => void
}

/**
 * Dedicated Table Data & Schema workspace tab (modern DB management tool standard).
 * Combines full-featured Visual Data Editor, column structure definitions,
 * foreign key & index inspector, and DDL statement viewer.
 */
export function TableWorkspace({ schema, selectedTable, onSelectTable }: TableWorkspaceProps) {
  const [activeSubTab, setActiveSubTab] = useState('data')

  const currentTable = useMemo(
    () => schema.find((t) => t.name === selectedTable) ?? (schema.length > 0 ? schema[0] : null),
    [schema, selectedTable]
  )

  const copyDdl = () => {
    if (!currentTable?.createSql) return
    void navigator.clipboard?.writeText(currentTable.createSql)
    message.success('CREATE TABLE statement copied to clipboard')
  }

  if (schema.length === 0) {
    return (
      <Empty
        description="No tables in this database. Generate tables from ERD first."
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  if (!currentTable) {
    return (
      <Empty
        description="Select a table from the sidebar to inspect its data and schema."
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  return (
    <div className="table-workspace" data-testid="table-workspace">
      <Card size="small" style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          <Space wrap align="center">
            <Typography.Text strong style={{ fontSize: 13 }}>
              Active Table:
            </Typography.Text>
            <Select
              size="middle"
              style={{ minWidth: 220 }}
              value={currentTable.name}
              onChange={onSelectTable}
              options={schema.map((t) => ({
                value: t.name,
                label: `${t.name} (${t.rowCount} rows)`
              }))}
            />
            <Tag color="blue">{currentTable.columns.length} column(s)</Tag>
            {currentTable.foreignKeys.length > 0 && (
              <Tag color="purple">{currentTable.foreignKeys.length} FK(s)</Tag>
            )}
            {currentTable.indexes.length > 0 && (
              <Tag color="cyan">{currentTable.indexes.length} Index(es)</Tag>
            )}
          </Space>
        </div>
      </Card>

      <Tabs
        type="card"
        size="small"
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        items={[
          {
            key: 'data',
            label: (
              <span>
                <TableOutlined style={{ marginRight: 6 }} />
                Data Grid & Editor
              </span>
            ),
            children: (
              <VisualDataEditor
                schema={schema}
                selectedTable={currentTable.name}
                onSelectTable={onSelectTable}
              />
            )
          },
          {
            key: 'structure',
            label: (
              <span>
                <DatabaseOutlined style={{ marginRight: 6 }} />
                Columns & Structure
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Table
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  rowKey="name"
                  dataSource={currentTable.columns}
                  columns={[
                    {
                      title: 'Column Name',
                      dataIndex: 'name',
                      render: (name: string, record) => (
                        <Space size="small">
                          <Typography.Text strong>{name}</Typography.Text>
                          {record.pk && <Tag color="gold">PK</Tag>}
                          {record.notnull && <Tag color="volcano">NOT NULL</Tag>}
                        </Space>
                      )
                    },
                    {
                      title: 'Data Type',
                      dataIndex: 'type',
                      render: (type: string) => type || 'ANY'
                    },
                    {
                      title: 'Primary Key',
                      dataIndex: 'pk',
                      render: (pk: boolean) => (pk ? <Tag color="gold">Yes (PK)</Tag> : 'No')
                    },
                    {
                      title: 'Nullable',
                      dataIndex: 'notnull',
                      render: (notnull: boolean) =>
                        notnull ? 'No (NOT NULL)' : 'Yes (NULL allowed)'
                    },
                    {
                      title: 'Default Value',
                      dataIndex: 'defaultValue',
                      render: (val: string | null) =>
                        val !== null ? (
                          <Typography.Text code>{val}</Typography.Text>
                        ) : (
                          <Typography.Text type="secondary">NULL</Typography.Text>
                        )
                    }
                  ]}
                />
              </Space>
            )
          },
          {
            key: 'relations',
            label: (
              <span>
                <KeyOutlined style={{ marginRight: 6 }} />
                Foreign Keys & Indexes
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  title="Foreign Keys"
                  items={
                    currentTable.foreignKeys.length === 0
                      ? [
                          {
                            key: 'none',
                            label: 'Relations',
                            children: 'No foreign key relationships defined on this table.'
                          }
                        ]
                      : currentTable.foreignKeys.map((fk, idx) => ({
                          key: String(idx),
                          label: fk.fromColumn,
                          children: `References ${fk.toTable} (${fk.toColumn || 'id'})`
                        }))
                  }
                />

                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  title="Indexes"
                  items={
                    currentTable.indexes.length === 0
                      ? [
                          {
                            key: 'none',
                            label: 'Indexes',
                            children: 'No additional indexes on this table.'
                          }
                        ]
                      : currentTable.indexes.map((idx, i) => ({
                          key: String(i),
                          label: idx.name,
                          children: `${idx.columns.join(', ')} ${idx.unique ? '(UNIQUE)' : ''}`
                        }))
                  }
                />
              </Space>
            )
          },
          {
            key: 'ddl',
            label: (
              <span>
                <CodeOutlined style={{ marginRight: 6 }} />
                DDL Definition
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography.Text type="secondary">
                    SQLite CREATE TABLE statement for {currentTable.name}:
                  </Typography.Text>
                  <Button size="small" icon={<CopyOutlined />} onClick={copyDdl}>
                    Copy DDL
                  </Button>
                </div>
                <pre className="ddl-preview__code" style={{ margin: 0 }}>
                  {currentTable.createSql ?? '(generated table)'}
                </pre>
              </Space>
            )
          }
        ]}
      />
    </div>
  )
}
