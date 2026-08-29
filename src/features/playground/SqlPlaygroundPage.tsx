import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, Result, Space, Spin, Tabs, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CodeOutlined,
  ConsoleSqlOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  TableOutlined
} from '@ant-design/icons'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import { useProjectDbStore } from '@/stores/projectDbStore'
import { usePlaygroundStore } from './playgroundStore'
import { SqlEditor } from './components/SqlEditor'
import { ResultViewer } from './components/ResultViewer'
import { HistoryPanel } from './components/HistoryPanel'
import { TableWorkspace } from './components/TableWorkspace'
import { DatabaseExplorer } from './components/DatabaseExplorer'
import { quoteIdentifier } from '@/lib/sqlite/identifier'
import type { ErdProject } from '@/features/erd/domain/schema'
import './playground.css'

/**
 * SQL Playground (Phase 3 Revamp): Modern Database Management Tool architecture.
 * Features dedicated SQL Console, Table Data & Schema workspace tabs,
 * and an interactive Database Object Explorer (spec §3, §16, §47).
 */
export function SqlPlaygroundPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [projectName, setProjectName] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>('console')
  const [consoleOutputTab, setConsoleOutputTab] = useState<string>('results')

  const { status, storageKind, schema, openFor } = useProjectDbStore()
  const {
    sql,
    result,
    running,
    history,
    lastMutationSql,
    loadFor,
    setSql,
    clearEditor,
    run,
    clearHistoryEntries
  } = usePlaygroundStore()

  const handleRun = (text: string) => {
    setActiveWorkspaceTab('console')
    setConsoleOutputTab('results')
    void run(text)
  }

  const handleGenerateQuery = (tableName: string) => {
    setSql(`SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 50;`)
    setActiveWorkspaceTab('console')
  }

  const handleOpenTableData = (tableName: string) => {
    setSelectedTable(tableName)
    setActiveWorkspaceTab('table-view')
  }

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

  useEffect(() => {
    if (!selectedTable && schema.length > 0) {
      setSelectedTable(schema[0].name)
    }
  }, [schema, selectedTable])

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
        <Space wrap align="center">
          <Link to="/projects">
            <Button type="text" icon={<ArrowLeftOutlined />} aria-label="Back to projects" />
          </Link>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {projectName ?? 'SQL Playground'}
          </Typography.Title>
          {statusTag}
        </Space>
        <Space wrap>
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
          <Card className="playground-page__schema" size="small" title="Database Explorer">
            <DatabaseExplorer
              schema={schema}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              onOpenTableData={handleOpenTableData}
              onGenerateQuery={handleGenerateQuery}
            />
          </Card>

          <div className="playground-page__main">
            <Tabs
              type="card"
              size="middle"
              activeKey={activeWorkspaceTab}
              onChange={setActiveWorkspaceTab}
              items={[
                {
                  key: 'console',
                  label: (
                    <span>
                      <ConsoleSqlOutlined style={{ marginRight: 6 }} />
                      SQL Console
                    </span>
                  ),
                  children: (
                    <div className="playground-console-workspace">
                      <Card size="small" style={{ marginBottom: 12 }}>
                        <SqlEditor
                          value={sql}
                          onChange={setSql}
                          onRun={handleRun}
                          onClear={clearEditor}
                          running={running}
                        />
                      </Card>

                      <Card size="small" className="playground-page__results">
                        <Tabs
                          size="small"
                          activeKey={consoleOutputTab}
                          onChange={setConsoleOutputTab}
                          items={[
                            {
                              key: 'results',
                              label: (
                                <span>
                                  <TableOutlined style={{ marginRight: 4 }} />
                                  Results
                                </span>
                              ),
                              children: <ResultViewer result={result} />
                            },
                            {
                              key: 'messages',
                              label: (
                                <span>
                                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                                  Messages & Last SQL
                                </span>
                              ),
                              children: (
                                <Space
                                  direction="vertical"
                                  style={{ width: '100%' }}
                                  size="middle"
                                >
                                  {lastMutationSql ? (
                                    <Alert
                                      type="info"
                                      showIcon
                                      message="Last Generated Mutation SQL (Visual Editor)"
                                      description={
                                        <pre className="ddl-preview__code" style={{ margin: 0 }}>
                                          {lastMutationSql}
                                        </pre>
                                      }
                                    />
                                  ) : (
                                    <Typography.Text type="secondary">
                                      No visual mutations executed yet in this session.
                                    </Typography.Text>
                                  )}
                                </Space>
                              )
                            },
                            {
                              key: 'history',
                              label: (
                                <span>
                                  <HistoryOutlined style={{ marginRight: 4 }} />
                                  Recent History ({history.length})
                                </span>
                              ),
                              children: (
                                <HistoryPanel
                                  history={history}
                                  onRerun={(entrySql) => {
                                    setSql(entrySql)
                                    handleRun(entrySql)
                                  }}
                                  onClear={clearHistoryEntries}
                                />
                              )
                            }
                          ]}
                        />
                      </Card>
                    </div>
                  )
                },
                {
                  key: 'table-view',
                  label: (
                    <span>
                      <TableOutlined style={{ marginRight: 6 }} />
                      Table Data & Schema
                      {selectedTable && (
                        <Tag color="blue" style={{ marginLeft: 6, fontSize: 11, padding: '0 4px' }}>
                          {selectedTable}
                        </Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <TableWorkspace
                      schema={schema}
                      selectedTable={selectedTable}
                      onSelectTable={setSelectedTable}
                    />
                  )
                },
                {
                  key: 'history',
                  label: (
                    <span>
                      <HistoryOutlined style={{ marginRight: 6 }} />
                      Full History ({history.length})
                    </span>
                  ),
                  children: (
                    <Card size="small">
                      <HistoryPanel
                        history={history}
                        onRerun={(entrySql) => {
                          setSql(entrySql)
                          handleRun(entrySql)
                        }}
                        onClear={clearHistoryEntries}
                      />
                    </Card>
                  )
                }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  )
}
