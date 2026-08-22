import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Empty, Input, List, Modal, Popconfirm, Space, Typography } from 'antd'
import {
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RightOutlined
} from '@ant-design/icons'
import { projectRepository, type ProjectSummary } from '@/lib/persistence/localProjectRepository'
import { createProject } from '@/features/erd/domain/factory'

/**
 * Project list (My Projects). Phase 1 keeps everything local; from Phase 4
 * this screen also shows Firestore-synced projects (spec §18).
 */
export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loaded, setLoaded] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ProjectSummary | null>(null)
  const [renameName, setRenameName] = useState('')

  const refresh = useCallback(async () => {
    const list = await projectRepository.listProjects()
    setProjects(list)
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleCreate = useCallback(async () => {
    const name = createName.trim() || 'Untitled ERD'
    setCreating(true)
    try {
      const project = createProject(name)
      await projectRepository.saveProject(project)
      setCreateOpen(false)
      setCreateName('')
      navigate(`/projects/${project.projectId}/erd`)
    } finally {
      setCreating(false)
    }
  }, [createName, navigate])

  const handleDelete = useCallback(
    async (id: string) => {
      await projectRepository.deleteProject(id)
      await refresh()
    },
    [refresh]
  )

  const handleRename = useCallback(async () => {
    if (!renameTarget) return
    const project = await projectRepository.loadProject(renameTarget.id)
    if (project) {
      project.name = renameName.trim() || project.name
      await projectRepository.saveProject(project)
    }
    setRenameTarget(null)
    await refresh()
  }, [renameTarget, renameName, refresh])

  return (
    <div className="page-narrow">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div className="page-header">
          <div>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              My Projects
            </Typography.Title>
            <Typography.Text type="secondary">
              Each project holds an ERD design. Everything is stored locally in this browser for now
              — cloud sync arrives in Phase 4.
            </Typography.Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCreateName('')
              setCreateOpen(true)
            }}
          >
            New project
          </Button>
        </div>

        {loaded && projects.length === 0 ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No projects yet. Create your first ERD!"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setCreateName('')
                  setCreateOpen(true)
                }}
              >
                New project
              </Button>
            </Empty>
          </Card>
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, column: 3 }}
            dataSource={projects}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => navigate(`/projects/${item.id}/erd`)}
                  actions={[
                    <EditOutlined
                      key="rename"
                      aria-label={`Rename ${item.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setRenameTarget(item)
                        setRenameName(item.name)
                      }}
                    />,
                    <Popconfirm
                      key="delete"
                      title="Delete this project?"
                      description="The local ERD and (later) its database will be removed."
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                      onConfirm={async () => {
                        await handleDelete(item.id)
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <DeleteOutlined
                        aria-label={`Delete ${item.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>,
                    <RightOutlined key="open" aria-label={`Open ${item.name}`} />
                  ]}
                >
                  <Card.Meta
                    avatar={<DatabaseOutlined style={{ fontSize: 24, color: '#1f3a5f' }} />}
                    title={item.name}
                    description={`Last edited ${new Date(item.updatedAt).toLocaleString()}`}
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Space>

      <Modal
        title="New ERD project"
        open={createOpen}
        okText="Create"
        confirmLoading={creating}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>Project name</Typography.Text>
          <Input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. Coffee Shop"
            onPressEnter={() => void handleCreate()}
            autoFocus
          />
        </Space>
      </Modal>

      <Modal
        title="Rename project"
        open={Boolean(renameTarget)}
        okText="Save"
        onCancel={() => setRenameTarget(null)}
        onOk={() => void handleRename()}
      >
        <Input
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onPressEnter={() => void handleRename()}
          autoFocus
        />
      </Modal>
    </div>
  )
}
