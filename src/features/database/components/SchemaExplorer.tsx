import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Descriptions, Empty, Space, Table, Tabs, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'
import { sqliteService } from '@/lib/sqlite/sqlJsRuntime'
import { quoteIdentifier } from '@/lib/sqlite/identifier'

const PAGE_SIZE = 50

interface RowsPage {
  columns: string[]
  rows: unknown[][]
  offset: number
}

/**
 * Schema Explorer (spec §16): tables, columns, PK/FK, indexes, CREATE TABLE
 * and row browsing. Read-only — mutations belong to the Phase 3 playground
 * and visual data editor.
 */
export function SchemaExplorer({
  schema,
  selectedTable,
  onSelectTable
}: {
  schema: TableInfo[]
  selectedTable: string | null
  onSelectTable: (name: string) => void
}) {
  const table = useMemo(
    () => schema.find((t) => t.name === selectedTable) ?? null,
    [schema, selectedTable]
  )

  const [rowsPage, setRowsPage] = useState<RowsPage | null>(null)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState<string | null>(null)

  const loadRows = useCallback(
    async (tableName: string, offset: number) => {
      setRowsLoading(true)
      setRowsError(null)
      const result = await sqliteService.execute(
        `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT ${PAGE_SIZE} OFFSET ${offset};`
      )
      setRowsLoading(false)
      if (result.kind === 'rows') {
        setRowsPage({ columns: result.columns ?? [], rows: result.rows ?? [], offset })
      } else {
        setRowsError(result.error?.raw ?? 'Could not load rows.')
        setRowsPage(null)
      }
    },
    []
  )

  useEffect(() => {
    setRowsPage(null)
    setRowsError(null)
    if (table) void loadRows(table.name, 0)
  }, [table?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  if (schema.length === 0) {
    return <Empty description="No tables in this database yet." />
  }

  return (
    <div className="schema-explorer">
      <div className="schema-explorer__list">
        <Typography.Text strong style={{ padding: '4px 8px', display: 'block' }}>
          Tables ({schema.length})
        </Typography.Text>
        {schema.map((t) => (
          <button
            key={t.name}
            type="button"
            className={`schema-explorer__item${t.name === selectedTable ? ' schema-explorer__item--active' : ''}`}
            onClick={() => onSelectTable(t.name)}
          >
            <span>{t.name}</span>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t.rowCount} rows
            </Typography.Text>
          </button>
        ))}
      </div>

      <div className="schema-explorer__detail">
        {!table ? (
          <Empty description="Select a table to inspect it." />
        ) : (
          <Tabs
            size="small"
            items={[
              {
                key: 'structure',
                label: 'Structure',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Table
                      size="small"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      rowKey="name"
                      dataSource={table.columns}
                      columns={[
                        { title: 'Column', dataIndex: 'name' },
                        { title: 'Type', dataIndex: 'type' },
                        {
                          title: 'Constraints',
                          render: (_, column) => (
                            <Space size={4} wrap>
                              {column.pk && <Tag color="gold">PK</Tag>}
                              {column.notnull && <Tag>NOT NULL</Tag>}
                              {table.indexes.some(
                                (i) => i.unique && i.columns.length === 1 && i.columns[0] === column.name
                              ) && <Tag color="blue">UNIQUE</Tag>}
                              {column.defaultValue !== null && (
                                <Tag color="default">DEFAULT {column.defaultValue}</Tag>
                              )}
                            </Space>
                          )
                        }
                      ]}
                    />

                    <Descriptions
                      size="small"
                      column={1}
                      bordered
                      title="Foreign keys"
                      items={
                        table.foreignKeys.length === 0
                          ? [{ key: 'none', label: 'None', children: '—' }]
                          : table.foreignKeys.map((fk, index) => ({
                              key: String(index),
                              label: fk.fromColumn,
                              children: `→ ${fk.toTable}${fk.toColumn ? ` (${fk.toColumn})` : ''}`
                            }))
                      }
                    />

                    <Descriptions
                      size="small"
                      column={1}
                      bordered
                      title="Indexes"
                      items={
                        table.indexes.length === 0
                          ? [{ key: 'none', label: 'None', children: '—' }]
                          : table.indexes.map((index) => ({
                              key: index.name,
                              label: index.name,
                              children: `${index.columns.join(', ')}${index.unique ? ' (unique)' : ''}`
                            }))
                      }
                    />

                    <div>
                      <Typography.Text strong>CREATE TABLE statement</Typography.Text>
                      <pre className="ddl-preview__code">{table.createSql ?? '(generated table)'}</pre>
                    </div>
                  </Space>
                )
              },
              {
                key: 'rows',
                label: `Rows (${table.rowCount})`,
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Space>
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        loading={rowsLoading}
                        onClick={() => void loadRows(table.name, rowsPage?.offset ?? 0)}
                      >
                        Refresh
                      </Button>
                      {rowsPage && (
                        <Space>
                          <Button
                            size="small"
                            disabled={rowsPage.offset === 0}
                            onClick={() => void loadRows(table.name, Math.max(0, rowsPage.offset - PAGE_SIZE))}
                          >
                            Previous
                          </Button>
                          <Typography.Text type="secondary">
                            offset {rowsPage.offset}
                          </Typography.Text>
                          <Button
                            size="small"
                            disabled={rowsPage.rows.length < PAGE_SIZE}
                            onClick={() => void loadRows(table.name, rowsPage.offset + PAGE_SIZE)}
                          >
                            Next
                          </Button>
                        </Space>
                      )}
                    </Space>
                    {rowsError ? (
                      <Typography.Text type="danger">{rowsError}</Typography.Text>
                    ) : (
                      <Table
                        size="small"
                        loading={rowsLoading}
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        rowKey={(_, index) => String(index)}
                        dataSource={rowsPage?.rows ?? []}
                        columns={(rowsPage?.columns ?? []).map((column) => ({
                          title: column,
                          render: (_: unknown, row: unknown[]) => {
                            const value = row[rowsPage?.columns.indexOf(column) ?? 0]
                            return value === null ? (
                              <Typography.Text type="secondary" italic>
                                NULL
                              </Typography.Text>
                            ) : (
                              String(value)
                            )
                          }
                        }))}
                      />
                    )}
                  </Space>
                )
              }
            ]}
          />
        )}
      </div>
    </div>
  )
}
