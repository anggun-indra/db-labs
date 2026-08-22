import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Modal,
  Result,
  Space,
  Spin,
  Tag,
  Typography,
  message
} from 'antd'
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  ConsoleSqlOutlined,
  DownloadOutlined,
  ExclamationCircleFilled,
  FileAddOutlined,
  ImportOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import { validateErd, hasBlockingErrors } from '@/features/erd/domain/validate'
import { generateSqliteSchema } from '@/lib/sqlite/ddlGenerator'
import { sqliteService } from '@/lib/sqlite/sqlJsRuntime'
import type { ErdProject } from '@/features/erd/domain/schema'
import { useProjectDbStore } from '@/stores/projectDbStore'
import { useAuthStore } from '@/stores/authStore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { SnapshotPanel } from '@/features/snapshots/SnapshotPanel'
import { DdlPreviewModal } from './components/DdlPreviewModal'
import { SchemaExplorer } from './components/SchemaExplorer'
import { downloadBytes } from '@/lib/download'
import './database.css'

/**
 * Database page (Phase 2): generate/rebuild the local SQLite database from
 * the ERD, explore its schema and rows, import/export/reset database bytes.
 * All SQL execution stays in the browser (spec §3).
 */
export function DatabasePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useAuthStore((s) => s.user)
  const [erd, setErd] = useState<ErdProject | null>(null)
  const [erdLoading, setErdLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'create' | 'rebuild'>('create')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [messageApi, messageContextHolder] = message.useMessage()

  const { status, storageKind, error, schema, drift, openFor, createFromDdl, importBytes, resetDb, refreshSchema } =
    useProjectDbStore()

  useEffect(() => {
    let cancelled = false
    if (!projectId) return
    setErdLoading(true)
    void projectRepository.loadProject(projectId).then((project) => {
      if (cancelled) return
      setErd(project)
      setErdLoading(false)
    })
    void openFor(projectId)
    return () => {
      cancelled = true
      // Keep the database open for other screens, but flush pending writes.
      void sqliteService.flush()
    }
  }, [projectId, openFor])

  // Keep drift fresh when the ERD loads later.
  useEffect(() => {
    if (erd && status === 'open') void refreshSchema(erd)
  }, [erd, status, refreshSchema])

  const validationIssues = useMemo(() => (erd ? validateErd(erd) : []), [erd])
  const blocked = hasBlockingErrors(validationIssues)
  const hasTables = (erd?.tables.length ?? 0) > 0
  const canGenerate = !blocked && hasTables

  const handleGenerate = useCallback(
    (mode: 'create' | 'rebuild') => {
      if (!erd) return
      if (!hasTables) {
        void messageApi.info('Add at least one table to your ERD first.')
        return
      }
      if (blocked) {
        void messageApi.error('Fix the blocking ERD errors before generating a database.')
        return
      }
      setPreviewMode(mode)
      setPreviewOpen(true)
    },
    [erd, blocked, hasTables, messageApi]
  )

  const generated = useMemo(() => {
    if (!previewOpen || !erd) return null
    return generateSqliteSchema(erd)
  }, [previewOpen, erd])

  const handleConfirmCreate = useCallback(async () => {
    if (!projectId || !generated) return
    try {
      await createFromDdl(projectId, generated.sql)
      setPreviewOpen(false)
      setSelectedTable(null)
      void messageApi.success(
        previewMode === 'create' ? 'Database created from your ERD.' : 'Database rebuilt from your ERD.'
      )
    } catch (createError) {
      void messageApi.error(
        createError instanceof Error ? createError.message : 'Database creation failed.'
      )
    }
  }, [projectId, generated, createFromDdl, previewMode, messageApi])

  const handleExport = useCallback(async () => {
    const bytes = await useProjectDbStore.getState().exportBytes()
    if (!bytes) {
      void messageApi.error('Nothing to export — no database is open.')
      return
    }
    const name = (erd?.name || 'database').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    downloadBytes(`${name}.sqlite`, bytes, 'application/x-sqlite3')
  }, [erd, messageApi])

  const handleImportFile = useCallback(
    async (file: File) => {
      if (!projectId) return
      const bytes = new Uint8Array(await file.arrayBuffer())
      try {
        await importBytes(projectId, bytes)
        setSelectedTable(null)
        void messageApi.success('Database imported.')
      } catch (importError) {
        void messageApi.error(
          importError instanceof Error ? importError.message : 'Import failed.'
        )
      }
    },
    [projectId, importBytes, messageApi]
  )

  const handleReset = useCallback(() => {
    if (!projectId) return
    Modal.confirm({
      title: 'Delete this database?',
      icon: <ExclamationCircleFilled />,
      content:
        'This removes the local SQLite database for this project. The ERD is not affected. Export a backup first if you need the data.',
      okText: 'Delete database',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        await resetDb(projectId)
        setSelectedTable(null)
      }
    })
  }, [projectId, resetDb])

  if (erdLoading) {
    return (
      <div className="page-centered">
        <Spin size="large" />
      </div>
    )
  }

  if (!projectId || !erd) {
    return (
      <div className="page-centered">
        <Result
          status="404"
          title="Project not found"
          extra={
            <Link to="/projects">
              <Button type="primary">Back to projects</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const statusTag =
    status === 'open' ? (
      <Tag color="success">open · {storageKind}</Tag>
    ) : status === 'loading' ? (
      <Tag color="processing">loading…</Tag>
    ) : status === 'error' ? (
      <Tag color="error">error</Tag>
    ) : (
      <Tag>no database yet</Tag>
    )

  return (
    <div className="database-page">
      {messageContextHolder}
      <div className="database-page__header">
        <Space>
          <Link to="/projects">
            <Button type="text" icon={<ArrowLeftOutlined />} aria-label="Back to projects" />
          </Link>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {erd.name}
          </Typography.Title>
          {statusTag}
        </Space>
        <Space wrap>
          <Link to={`/projects/${projectId}/erd`}>
            <Button icon={<ApartmentOutlined />}>Edit ERD</Button>
          </Link>
          <Link to={`/projects/${projectId}/sql`}>
            <Button icon={<ConsoleSqlOutlined />} disabled={status !== 'open'}>
              SQL Playground
            </Button>
          </Link>
          {status === 'open' ? (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => handleGenerate('rebuild')}
            >
              Rebuild from ERD
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={() => handleGenerate('create')}
              disabled={!canGenerate}
            >
              Generate from ERD
            </Button>
          )}
          <Button icon={<ImportOutlined />} onClick={() => fileInputRef.current?.click()}>
            Import
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => void handleExport()} disabled={status !== 'open'}>
            Export
          </Button>
          <Button danger icon={<ReloadOutlined />} onClick={handleReset} disabled={status !== 'open'}>
            Reset
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite,.sqlite3,.db,application/x-sqlite3"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImportFile(file)
              event.target.value = ''
            }}
          />
        </Space>
      </div>

      {blocked && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="This ERD has blocking errors"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {validationIssues
                .filter((issue) => issue.severity === 'error')
                .slice(0, 5)
                .map((issue) => (
                  <li key={issue.id}>{issue.message}</li>
                ))}
            </ul>
          }
        />
      )}

      {status === 'open' && drift?.drifted && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Your ERD has changed since this database was created."
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {drift.differences.slice(0, 5).map((difference) => (
                  <li key={difference}>{difference}</li>
                ))}
                {drift.differences.length > 5 && <li>… and more</li>}
              </ul>
              <Space>
                <Button size="small" onClick={() => void handleExport()}>
                  Download backup
                </Button>
                <Button size="small" type="primary" onClick={() => handleGenerate('rebuild')}>
                  Rebuild
                </Button>
              </Space>
            </Space>
          }
        />
      )}

      {error && (
        <Alert type="error" showIcon style={{ marginBottom: 12 }} message={error} />
      )}

      <Card className="database-page__body">
        {status === 'loading' ? (
          <div className="page-centered">
            <Spin tip="Opening database…" />
          </div>
        ) : status === 'open' ? (
          <SchemaExplorer
            schema={schema}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
          />
        ) : (
          <div className="page-centered">
            <Result
              icon={<FileAddOutlined style={{ color: '#1f3a5f' }} />}
              title="No database yet"
              subTitle="Generate a SQLite database from your ERD. You will see the exact CREATE TABLE statements before anything runs."
              extra={
                <Button
                  type="primary"
                  icon={<FileAddOutlined />}
                  onClick={() => handleGenerate('create')}
                  disabled={!canGenerate}
                >
                  Generate from ERD
                </Button>
              }
            />
          </div>
        )}
      </Card>

      {isFirebaseConfigured() && user && <SnapshotPanel projectId={projectId} erd={erd} />}

      <DdlPreviewModal
        open={previewOpen}
        mode={previewMode}
        generated={generated}
        hasExistingData={status === 'open'}
        onConfirm={() => void handleConfirmCreate()}
        onCancel={() => setPreviewOpen(false)}
      />
    </div>
  )
}
