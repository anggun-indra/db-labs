import { useMemo, useState } from 'react'
import { Badge, Empty, List, Space, Tag, Typography } from 'antd'
import { CloseCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { validateErd } from '@/features/erd/domain/validate'
import type { ValidationIssue } from '@/features/erd/domain/schema'
import { useErdEditorStore } from '@/stores/erdEditorStore'

const severityIcon = {
  error: <CloseCircleOutlined style={{ color: 'var(--dsw-alias-state-error-primary)' }} />,
  warning: <ExclamationCircleOutlined style={{ color: 'var(--dsw-alias-state-warn-primary)' }} />,
  info: <InfoCircleOutlined style={{ color: 'var(--dsw-static-deepseek-450)' }} />
} as const

const severityTagColor = {
  error: 'error',
  warning: 'warning',
  info: 'processing'
} as const

/**
 * Validation panel (spec §9): lists errors/warnings/info without blocking
 * work. Clicking an issue selects the related table.
 */
export function ValidationPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const project = useErdEditorStore((s) => s.project)
  const selectTable = useErdEditorStore((s) => s.selectTable)

  const issues = useMemo(() => (project ? validateErd(project) : []), [project])
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length

  if (!project) return null

  return (
    <div className={`validation-panel${collapsed ? ' validation-panel--collapsed' : ''}`}>
      <button
        type="button"
        className="validation-panel__header"
        onClick={() => setCollapsed((value) => !value)}
      >
        <Space>
          <Typography.Text strong>Validation</Typography.Text>
          <Badge count={errors} color="var(--dsw-alias-state-error-primary)" showZero={false} overflowCount={99} />
          <Badge count={warnings} color="var(--dsw-alias-state-warn-primary)" showZero={false} overflowCount={99} />
          {issues.length === 0 && <Tag color="success">All good</Tag>}
        </Space>
        <Typography.Text type="secondary">{collapsed ? 'Show' : 'Hide'}</Typography.Text>
      </button>

      {!collapsed && (
        <div className="validation-panel__body">
          {issues.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No issues found in this ERD."
            />
          ) : (
            <List
              size="small"
              dataSource={issues}
              renderItem={(issue: ValidationIssue) => (
                <List.Item
                  className="validation-panel__issue"
                  onClick={() => {
                    if (issue.entityType === 'table') selectTable(issue.entityId)
                  }}
                >
                  <Space align="start" size="small">
                    {severityIcon[issue.severity]}
                    <div>
                      <Typography.Text style={{ fontSize: 12 }}>{issue.message}</Typography.Text>
                      <div>
                        <Tag color={severityTagColor[issue.severity]} style={{ fontSize: 10 }}>
                          {issue.code}
                        </Tag>
                      </div>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}
