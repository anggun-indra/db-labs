import { useMemo, useState } from 'react'
import { Button, Empty, Input, Space, Tag, Tooltip, Typography } from 'antd'
import {
  CodeOutlined,
  DownOutlined,
  RightOutlined,
  SearchOutlined,
  TableOutlined
} from '@ant-design/icons'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'

interface DatabaseExplorerProps {
  schema: TableInfo[]
  selectedTable: string | null
  onSelectTable: (tableName: string) => void
  onOpenTableData: (tableName: string) => void
  onGenerateQuery: (tableName: string) => void
}

/**
 * Modern Database Object Explorer sidebar (spec §16, §47).
 * Displays searchable list of tables, expandable column schema, and quick
 * action buttons to view data grid or construct boilerplate queries.
 */
export function DatabaseExplorer({
  schema,
  selectedTable,
  onSelectTable,
  onOpenTableData,
  onGenerateQuery
}: DatabaseExplorerProps) {
  const [filter, setFilter] = useState('')
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})

  const filteredSchema = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return schema
    return schema.filter((table) => table.name.toLowerCase().includes(query))
  }, [schema, filter])

  const toggleExpand = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }))
  }

  if (schema.length === 0) {
    return (
      <Empty description="No tables found in this database." image={Empty.PRESENTED_IMAGE_SIMPLE} />
    )
  }

  return (
    <div className="database-explorer" data-testid="database-explorer">
      <div className="database-explorer__header">
        <Input
          size="small"
          placeholder="Filter tables..."
          prefix={<SearchOutlined style={{ color: 'var(--dsw-alias-label-tertiary)' }} />}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          allowClear
          style={{ marginBottom: 8 }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 4px 6px'
          }}
        >
          <Typography.Text
            strong
            style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}
          >
            TABLES ({schema.length})
          </Typography.Text>
        </div>
      </div>

      <div className="database-explorer__list">
        {filteredSchema.length === 0 ? (
          <Empty
            description="No matching tables"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '16px 0' }}
          />
        ) : (
          filteredSchema.map((table) => {
            const isSelected = table.name === selectedTable
            const isExpanded = expandedTables[table.name] ?? false

            return (
              <div
                key={table.name}
                className={`database-explorer__table-node ${isSelected ? 'database-explorer__table-node--selected' : ''}`}
                onClick={() => onSelectTable(table.name)}
              >
                <div className="database-explorer__table-header">
                  <span
                    className="database-explorer__expand-icon"
                    onClick={(e) => toggleExpand(table.name, e)}
                    aria-label={`Toggle columns for ${table.name}`}
                  >
                    {isExpanded ? (
                      <DownOutlined style={{ fontSize: 10 }} />
                    ) : (
                      <RightOutlined style={{ fontSize: 10 }} />
                    )}
                  </span>

                  <TableOutlined style={{ color: 'var(--dsw-alias-primary)', marginRight: 6 }} />

                  <span className="database-explorer__table-name" title={table.name}>
                    {table.name}
                  </span>

                  <Tag
                    className="database-explorer__row-count"
                    style={{ marginLeft: 'auto', marginRight: 4 }}
                  >
                    {table.rowCount}
                  </Tag>

                  <Space
                    size={2}
                    className="database-explorer__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title={`View data for ${table.name}`}>
                      <Button
                        size="small"
                        type="text"
                        icon={<TableOutlined />}
                        onClick={() => onOpenTableData(table.name)}
                        style={{ width: 22, height: 22, minWidth: 22, padding: 0 }}
                      />
                    </Tooltip>
                    <Tooltip title={`Query SELECT * FROM ${table.name}`}>
                      <Button
                        size="small"
                        type="text"
                        icon={<CodeOutlined />}
                        onClick={() => onGenerateQuery(table.name)}
                        style={{ width: 22, height: 22, minWidth: 22, padding: 0 }}
                      />
                    </Tooltip>
                  </Space>
                </div>

                {isExpanded && (
                  <div className="database-explorer__columns-list">
                    {table.columns.map((column) => (
                      <div key={column.name} className="database-explorer__column-item">
                        <Space size={4} style={{ overflow: 'hidden' }}>
                          <span className="database-explorer__column-name" title={column.name}>
                            {column.name}
                          </span>
                          <span className="database-explorer__column-type">
                            {column.type || 'ANY'}
                          </span>
                        </Space>
                        <Space size={2}>
                          {column.pk && (
                            <Tag
                              color="gold"
                              style={{
                                fontSize: 9,
                                lineHeight: '13px',
                                padding: '0 3px',
                                margin: 0
                              }}
                            >
                              PK
                            </Tag>
                          )}
                          {column.notnull && (
                            <Tag
                              color="volcano"
                              style={{
                                fontSize: 9,
                                lineHeight: '13px',
                                padding: '0 3px',
                                margin: 0
                              }}
                            >
                              NN
                            </Tag>
                          )}
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
