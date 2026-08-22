import { Alert, Button, Modal, Space, Typography } from 'antd'
import { CopyOutlined, DownloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { GeneratedSchema } from '@/lib/sqlite/ddlGenerator'
import { downloadText } from '@/lib/download'

interface DdlPreviewModalProps {
  open: boolean
  mode: 'create' | 'rebuild'
  generated: GeneratedSchema | null
  hasExistingData: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * DDL preview before creating/rebuilding the database (spec §11 teaching
 * requirement: students always see the generated SQL).
 */
export function DdlPreviewModal({
  open,
  mode,
  generated,
  hasExistingData,
  onConfirm,
  onCancel
}: DdlPreviewModalProps) {
  if (!generated) return null

  const copySql = () => {
    void navigator.clipboard?.writeText(generated.sql)
  }

  return (
    <Modal
      title={mode === 'create' ? 'Generated SQLite schema' : 'Rebuild database from ERD'}
      open={open}
      width={720}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            danger={hasExistingData && mode === 'rebuild'}
            icon={<ThunderboltOutlined />}
            onClick={onConfirm}
          >
            {mode === 'create' ? 'Create database' : 'Rebuild database'}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {hasExistingData && mode === 'rebuild' && (
          <Alert
            type="warning"
            showIcon
            message="Your ERD has changed since this database was created."
            description="Rebuilding recreates the schema from the ERD and will remove existing data. Download a backup first if you need the current data."
          />
        )}

        {generated.warnings.length > 0 && (
          <Alert
            type="info"
            showIcon
            message="Generator notes"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {generated.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            }
          />
        )}

        <div className="ddl-preview">
          <div className="ddl-preview__toolbar">
            <Typography.Text type="secondary">
              {generated.statements.length} statement{generated.statements.length === 1 ? '' : 's'}
            </Typography.Text>
            <Space>
              <Button size="small" icon={<CopyOutlined />} onClick={copySql}>
                Copy SQL
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadText('schema.sql', generated.sql, 'application/sql')}
              >
                Download .sql
              </Button>
            </Space>
          </div>
          <pre className="ddl-preview__code" data-testid="ddl-preview-code">
            {generated.sql}
          </pre>
        </div>
      </Space>
    </Modal>
  )
}
