import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Result, Spin } from 'antd'
import { ReactFlowProvider } from '@xyflow/react'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import { useErdEditorStore } from '@/stores/erdEditorStore'
import { ErdCanvas } from './components/ErdCanvas'
import { ErdToolbar } from './components/ErdToolbar'
import { TableInspector } from './components/TableInspector'
import { ValidationPanel } from './components/ValidationPanel'
import { RelationshipDialog } from './components/RelationshipDialog'
import './erd.css'

type LoadState = 'loading' | 'ready' | 'not-found'

/**
 * The ERD editor page (Phase 1 core screen). Loads the project from local
 * persistence into the editor store and mounts the canvas + panels.
 */
export function ErdEditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const loadProject = useErdEditorStore((s) => s.loadProject)
  const closeProject = useErdEditorStore((s) => s.closeProject)
  const undo = useErdEditorStore((s) => s.undo)
  const redo = useErdEditorStore((s) => s.redo)

  useEffect(() => {
    let cancelled = false
    if (!projectId) {
      setLoadState('not-found')
      return
    }
    void projectRepository.loadProject(projectId).then((project) => {
      if (cancelled) return
      if (!project) {
        setLoadState('not-found')
        return
      }
      loadProject(project)
      setLoadState('ready')
    })
    return () => {
      cancelled = true
      closeProject()
    }
  }, [projectId, loadProject, closeProject])

  // Keyboard shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo.
  // Ignored while typing inside inputs so text editing behaves normally.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  if (loadState === 'loading') {
    return (
      <div className="page-centered">
        <Spin size="large" tip="Loading project…" />
      </div>
    )
  }

  if (loadState === 'not-found') {
    return (
      <div className="page-centered">
        <Result
          status="404"
          title="Project not found"
          subTitle="This ERD project does not exist in this browser."
          extra={
            <Button type="primary" onClick={() => navigate('/projects')}>
              Back to projects
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="erd-editor">
        <ErdToolbar />
        <div className="erd-editor__canvas">
          <ErdCanvas />
          <ValidationPanel />
        </div>
        <TableInspector />
        <RelationshipDialog />
        <Alert
          className="erd-editor__mobile-hint"
          type="info"
          showIcon
          message="ERD editing works best on a tablet or desktop."
          banner
        />
      </div>
    </ReactFlowProvider>
  )
}
