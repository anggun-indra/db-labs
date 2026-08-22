import { Button, Empty, List, Popconfirm, Space, Tag, Typography } from 'antd'
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'
import type { QueryHistoryEntry } from '../domain/queryHistory'

interface HistoryPanelProps {
  history: QueryHistoryEntry[]
  onRerun: (sql: string) => void
  onClear: () => void
}

/** SQL history (Phase 3): text, timestamp, success/failure, timing, re-run. */
export function HistoryPanel({ history, onRerun, onClear }: HistoryPanelProps) {
  if (history.length === 0) {
    return <Empty description="No queries yet. Your history is stored locally per project." />
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Space>
        <Typography.Text type="secondary">{history.length} entries (newest first)</Typography.Text>
        <Popconfirm title="Clear SQL history for this project?" onConfirm={onClear}>
          <Button size="small" danger icon={<DeleteOutlined />}>
            Clear history
          </Button>
        </Popconfirm>
      </Space>
      <List
        size="small"
        dataSource={history}
        split
        renderItem={(entry) => (
          <List.Item
            key={entry.id}
            actions={[
              <Button
                key="rerun"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => onRerun(entry.sql)}
              >
                Re-run
              </Button>
            ]}
          >
            <List.Item.Meta
              title={
                <Typography.Text code style={{ fontSize: 12 }}>
                  {entry.sql}
                </Typography.Text>
              }
              description={
                <Space size="small">
                  {entry.ok ? <Tag color="success">ok</Tag> : <Tag color="error">failed</Tag>}
                  <Typography.Text type="secondary">
                    {entry.executionTimeMs.toFixed(1)} ms ·{' '}
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </Typography.Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Space>
  )
}
