import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Space, Tag, Tooltip } from 'antd'
import {
  ArrowLeftOutlined,
  DatabaseOutlined,
  ExpandOutlined,
  PlusOutlined,
  RedoOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons'
import { useReactFlow } from '@xyflow/react'
import { useErdEditorStore } from '@/stores/erdEditorStore'
import type { SaveStatus } from '@/stores/erdEditorStore'

const saveStatusConfig: Record<SaveStatus, { color: string; label: string }> = {
  saved: { color: 'success', label: 'Saved' },
  saving: { color: 'processing', label: 'Saving…' },
  dirty: { color: 'warning', label: 'Unsaved changes' },
  offline: { color: 'default', label: 'Offline' }
}

/**
 * Editor toolbar: project name, save status, add table, undo/redo, view
 * controls. Save status display is required by spec §19.
 */
export function ErdToolbar({ projectId }: { projectId?: string }) {
  const projectName = useErdEditorStore((s) => s.project?.name ?? '')
  const saveStatus = useErdEditorStore((s) => s.saveStatus)
  const canUndo = useErdEditorStore((s) => s.past.length > 0)
  const canRedo = useErdEditorStore((s) => s.future.length > 0)
  const renameProject = useErdEditorStore((s) => s.renameProject)
  const addTable = useErdEditorStore((s) => s.addTable)
  const undo = useErdEditorStore((s) => s.undo)
  const redo = useErdEditorStore((s) => s.redo)

  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow()

  const handleAddTable = useCallback(() => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 - 120 + Math.random() * 80 - 40,
      y: window.innerHeight / 2 - 80 + Math.random() * 60 - 30
    })
    addTable(position)
  }, [screenToFlowPosition, addTable])

  const status = saveStatusConfig[saveStatus]

  return (
    <div className="erd-toolbar">
      <Space size="small">
        <Tooltip title="Back to projects">
          <Link to="/projects">
            <Button type="text" icon={<ArrowLeftOutlined />} aria-label="Back to projects" />
          </Link>
        </Tooltip>
        <Input
          value={projectName}
          onChange={(e) => renameProject(e.target.value)}
          placeholder="Project name"
          variant="borderless"
          className="erd-toolbar__name"
          aria-label="Project name"
        />
        <Tag color={status.color}>{status.label}</Tag>
      </Space>

      <Space size="small">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTable}>
          Add table
        </Button>
        {projectId && (
          <Link to={`/projects/${projectId}/database`}>
            <Button icon={<DatabaseOutlined />}>Database</Button>
          </Link>
        )}
        <Button.Group>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button icon={<UndoOutlined />} onClick={undo} disabled={!canUndo} aria-label="Undo" />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Shift+Z)">
            <Button icon={<RedoOutlined />} onClick={redo} disabled={!canRedo} aria-label="Redo" />
          </Tooltip>
        </Button.Group>
        <Button.Group>
          <Button icon={<ZoomOutOutlined />} onClick={() => void zoomOut()} aria-label="Zoom out" />
          <Button icon={<ZoomInOutlined />} onClick={() => void zoomIn()} aria-label="Zoom in" />
          <Button
            icon={<ExpandOutlined />}
            onClick={() => void fitView({ padding: 0.2, duration: 300 })}
            aria-label="Fit view"
          />
        </Button.Group>
      </Space>
    </div>
  )
}
