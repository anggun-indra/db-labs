import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, Result, Space, Spin, Tabs, Tag, Typography } from 'antd'
import { ApartmentOutlined, ArrowLeftOutlined, CodeOutlined } from '@ant-design/icons'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import { useProjectDbStore } from '@/stores/projectDbStore'
import { usePlaygroundStore } from './playgroundStore'
import { SqlEditor } from './components/SqlEditor'
import { ResultViewer } from './components/ResultViewer'
import { HistoryPanel } from './components/HistoryPanel'
import { VisualDataEditor } from './components/VisualDataEditor'
import { SchemaExplorer } from '@/features/database/components/SchemaExplorer'
import type { ErdProject } from '@/features/erd/domain/schema'
import './playground.css'

/**
 * SQL Playground (Phase 3): practice SQL against the project's local SQLite
 * database. Everything executes in the browser (spec §3).
 */
export function SqlPlaygroundPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [projectName, setProjectName] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  const { status, storageKind, schema, openFor } = useProjectDbStore()
  const { sql, result, running, history, lastMutationSql, loadFor, setSql, clearEditor, run, clearHistoryEntries } =
    usePlaygroundStore()

  useEffect(() => {
    if (!projectId) return
    void projectRepository.loadProject(projectId).then((project: ErdProject | null) => {
      if (!project) {
        setNotFound(true)
        return
      }
      setProjectName(project.name)
    })
    void openFor(projectId)
    loadFor(projectId)
  }, [projectId, openFor, loadFor])

  if (notFound || !projectId) {
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
    <div className="playground-page">
      <div className="playground-page__header">
        <Space>
          <Link to="/projects">
            <Button type="text" icon={<ArrowLeftOutlined />} aria-label="Back to projects" />
          </Link>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {projectName ?? 'SQL Playground'}
          </Typography.Title>
          {statusTag}
        </Space>
        <Space>
          <Link to={`/projects/${projectId}/erd`}>
            <Button icon={<ApartmentOutlined />}>Edit ERD</Button>
          </Link>
          <Link to={`/projects/${projectId}/database`}>
            <Button icon={<CodeOutlined />}>Database</Button>
          </Link>
        </Space>
      </div>

      {status === 'loading' ? (
        <div className="page-centered">
          <Spin tip="Opening database…" />
        </div>
      ) : status !== 'open' ? (
        <Card>
          <Result
            title="No database to query yet"
            subTitle="Generate a SQLite database from your ERD first, then practice SQL here."
            extra={
              <Link to={`/projects/${projectId}/database`}>
                <Button type="primary">Go to database generation</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="playground-page__grid">
          <Card className="playground-page__schema" size="small" title="Schema">
            <SchemaExplorer
              schema={schema}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
            />
          </Card>

          <div className="playground-page__main">
            <Card size="small">
              <SqlEditor
                value={sql}
                onChange={setSql}
                onRun={(text) => void run(text)}
                onClear={clearEditor}
                running={running}
              />
            </Card>

            <Card size="small" className="playground-page__results">
              {lastMutationSql && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 8 }}
                  message="Last generated mutation SQL"
                  description={
                    <pre className="ddl-preview__code" style={{ margin: 0 }}>
                      {lastMutationSql}
                    </pre>
                  }
                />
              )}
              <Tabs
                size="small"
                items={[
                  {
                    key: 'results',
                    label: 'Results',
                    children: <ResultViewer result={result} />
                  },
                  {
                    key: 'data',
                    label: 'Data editor',
                    children: <VisualDataEditor schema={schema} />
                  },
                  {
                    key: 'history',
                    label: `History (${history.length})`,
                    children: (
                      <HistoryPanel
                        history={history}
                        onRerun={(entrySql) => {
                          setSql(entrySql)
                          void run(entrySql)
                        }}
                        onClear={clearHistoryEntries}
                      />
                    )
                  }
                ]}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
