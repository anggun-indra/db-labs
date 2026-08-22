import { useMemo } from 'react'
import { Alert, Button, Empty, Space, Table, Typography } from 'antd'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import type { QueryExecutionResult } from '@/lib/sqlite/queryResult'
import { capRows } from '../domain/sqlExecution'
import { toCsv } from '../domain/csv'
import { downloadText } from '@/lib/download'

/**
 * Result viewer (Phase 3): tabular display with capped rendering (default
 * 500 rows, spec §47), timing, affected rows, copy and CSV export.
 * Errors show the raw SQLite message plus the educational hint.
 */
export function ResultViewer({ result }: { result: QueryExecutionResult | null }) {
  const capped = useMemo(
    () => (result?.kind === 'rows' ? capRows(result.rows ?? []) : null),
    [result]
  )

  if (!result) {
    return <Empty description="Run a query to see results here." />
  }

  if (result.kind === 'error') {
    return (
      <Alert
        type="error"
        showIcon
        message={result.error?.raw ?? 'Query failed.'}
        description={
          result.error?.hint ? (
            <span data-testid="error-hint">{result.error.hint}</span>
          ) : undefined
        }
      />
    )
  }

  if (result.kind === 'mutation') {
    return (
      <Alert
        type="success"
        showIcon
        message={`${result.affectedRows ?? 0} row(s) affected`}
        description={`Executed in ${result.executionTimeMs.toFixed(1)} ms.`}
      />
    )
  }

  const columns = result.columns ?? []
  const rows = capped?.displayRows ?? []

  const copyTsv = () => {
    const text = [columns.join('\t'), ...rows.map((row) => row.map(String).join('\t'))].join('\n')
    void navigator.clipboard?.writeText(text)
  }

  const exportCsv = () => {
    downloadText('query-result.csv', toCsv(columns, rows), 'text/csv')
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Space wrap>
        <Typography.Text type="secondary">
          {result.rows?.length ?? 0} row(s) · {result.executionTimeMs.toFixed(1)} ms
        </Typography.Text>
        <Button size="small" icon={<CopyOutlined />} onClick={copyTsv}>
          Copy
        </Button>
        <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>
          Export CSV
        </Button>
      </Space>
      {capped?.capped && (
        <Alert
          type="info"
          showIcon
          message={`Showing the first ${rows.length} of ${capped.totalRows} rows. The full result was still computed by SQLite.`}
        />
      )}
      <Table
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        rowKey={(_, index) => String(index)}
        dataSource={rows}
        columns={columns.map((column, columnIndex) => ({
          title: column,
          render: (_: unknown, row: unknown[]) => {
            const cell = row[columnIndex]
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
    </Space>
  )
}
