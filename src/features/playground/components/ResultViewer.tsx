import { useMemo } from 'react'
import { Alert, Button, Empty, Space, Table, Tag, Typography } from 'antd'
import {
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import type { QueryExecutionResult } from '@/lib/sqlite/queryResult'
import { capRows } from '../domain/sqlExecution'
import { toCsv } from '../domain/csv'
import { downloadText } from '@/lib/download'

interface TableRowRecord {
  __rowId: number
  [key: number]: unknown
}

/**
 * Result viewer (Phase 3): tabular display with capped rendering (default
 * 500 rows, spec §47), timing, affected rows, copy and CSV export.
 * Errors show the raw SQLite message, execution metrics, and educational hints.
 */
export function ResultViewer({ result }: { result: QueryExecutionResult | null }) {
  const capped = useMemo(
    () => (result?.kind === 'rows' ? capRows(result.rows ?? []) : null),
    [result]
  )

  const columns = useMemo(
    () => (result?.kind === 'rows' ? (result.columns ?? []) : []),
    [result]
  )
  const rows = useMemo(() => capped?.displayRows ?? [], [capped])

  const tableDataSource: TableRowRecord[] = useMemo(
    () =>
      rows.map((row, index) => {
        const record: TableRowRecord = { __rowId: index }
        row.forEach((cell, cellIndex) => {
          record[cellIndex] = cell
        })
        return record
      }),
    [rows]
  )

  if (!result) {
    return <Empty description="Run a query to see results and execution metrics here." />
  }

  // Error result handling
  if (result.kind === 'error') {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap size="small">
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Execution Error
            </Tag>
            {result.error?.code && <Tag color="magenta">{result.error.code}</Tag>}
          </Space>
          <Space size="small">
            <Typography.Text type="secondary">
              <ClockCircleOutlined /> {result.executionTimeMs.toFixed(1)} ms
            </Typography.Text>
          </Space>
        </Space>

        <Alert
          type="error"
          showIcon
          message={
            <Typography.Text strong style={{ fontSize: 13 }}>
              {result.error?.raw ?? 'Query failed.'}
            </Typography.Text>
          }
          description={
            <div className="result-viewer__error-details" style={{ marginTop: 8 }}>
              {result.error?.hint && (
                <div
                  data-testid="error-hint"
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                    background: 'rgba(250, 173, 20, 0.08)',
                    border: '1px solid rgba(250, 173, 20, 0.25)',
                    borderRadius: 6
                  }}
                >
                  <BulbOutlined style={{ color: '#d48806', marginTop: 3, flexShrink: 0 }} />
                  <div>
                    <Typography.Text
                      strong
                      style={{ color: '#d48806', display: 'block', marginBottom: 2 }}
                    >
                      Educational Hint & Lab Solution:
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12 }}>{result.error.hint}</Typography.Text>
                  </div>
                </div>
              )}
            </div>
          }
        />
      </Space>
    )
  }

  // Mutation result handling (INSERT, UPDATE, DELETE, DDL)
  if (result.kind === 'mutation') {
    const affected = result.affectedRows ?? 0
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap size="small">
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Success
            </Tag>
            <Tag color="blue">{affected} row(s) affected</Tag>
          </Space>
          <Space size="small">
            <Typography.Text type="secondary">
              <ClockCircleOutlined /> {result.executionTimeMs.toFixed(1)} ms
            </Typography.Text>
          </Space>
        </Space>

        {affected > 0 ? (
          <Alert
            type="success"
            showIcon
            message={`Query executed successfully. ${affected} row(s) modified.`}
            description={`Execution time: ${result.executionTimeMs.toFixed(1)} ms.`}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Query executed successfully (0 rows affected)."
            description={`The statement was executed in ${result.executionTimeMs.toFixed(1)} ms, but no existing records matched the criteria or were changed.`}
          />
        )}
      </Space>
    )
  }

  const copyTsv = () => {
    const text = [columns.join('\t'), ...rows.map((row) => row.map(String).join('\t'))].join('\n')
    void navigator.clipboard?.writeText(text)
  }

  const exportCsv = () => {
    downloadText('query-result.csv', toCsv(columns, rows), 'text/csv')
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap size="small">
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Success
          </Tag>
          <Typography.Text type="secondary">
            {result.rows?.length ?? 0} row(s) · {result.executionTimeMs.toFixed(1)} ms
          </Typography.Text>
          {columns.length > 0 && <Tag>{columns.length} col(s)</Tag>}
        </Space>
        {rows.length > 0 && (
          <Space size="small">
            <Button size="small" icon={<CopyOutlined />} onClick={copyTsv}>
              Copy TSV
            </Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>
              Export CSV
            </Button>
          </Space>
        )}
      </Space>

      {capped?.capped && (
        <Alert
          type="info"
          showIcon
          message={`Showing the first ${rows.length} of ${capped.totalRows} rows. The full result was still computed by SQLite.`}
        />
      )}

      {rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={`Empty result set (0 rows returned in ${result.executionTimeMs.toFixed(1)} ms).`}
        />
      ) : (
        <Table
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
          rowKey="__rowId"
          dataSource={tableDataSource}
          columns={columns.map((column, columnIndex) => ({
            title: column,
            key: `col_${columnIndex}_${column}`,
            render: (_: unknown, record: TableRowRecord) => {
              const cell = record[columnIndex]
              return cell === null ? (
                <Typography.Text type="secondary" italic>
                  NULL
                </Typography.Text>
              ) : (
                String(cell)
              )
            }
          }))}
        />
      )}
    </Space>
  )
}
