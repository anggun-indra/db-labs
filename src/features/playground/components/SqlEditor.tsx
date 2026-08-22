import { useCallback, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Button, Space, Tooltip } from 'antd'
import { ClearOutlined, PlayCircleOutlined } from '@ant-design/icons'
import '@/lib/monaco/setup'

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onRun: (text: string) => void
  onClear: () => void
  running: boolean
  disabled?: boolean
}

/**
 * Monaco SQL editor (Phase 3): run selection if there is one, otherwise run
 * the whole content. Ctrl/Cmd+Enter runs from the keyboard.
 */
export function SqlEditor({ value, onChange, onRun, onClear, running, disabled }: SqlEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const runCurrent = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    const selectedText = selection ? editor.getModel()?.getValueInRange(selection) : undefined
    const full = editor.getValue()
    onRun(selectedText && selectedText.trim().length > 0 ? selectedText : full)
  }, [onRun])

  // Keep the latest runCurrent reachable from the Monaco command closure.
  const runCurrentRef = useRef(runCurrent)
  runCurrentRef.current = runCurrent

  const handleMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      runCurrentRef.current()
    })
  }

  return (
    <div className="sql-editor">
      <div className="sql-editor__toolbar">
        <Space>
          <Tooltip title="Run the selection, or the whole script if nothing is selected (Ctrl/Cmd+Enter)">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={runCurrent}
              loading={running}
              disabled={disabled}
            >
              Run
            </Button>
          </Tooltip>
          <Button icon={<ClearOutlined />} onClick={onClear} disabled={disabled}>
            Clear
          </Button>
        </Space>
        <span className="sql-editor__hint">
          Tip: select part of the script to run only that part.
        </span>
      </div>
      <div className="sql-editor__monaco" data-testid="sql-editor">
        <Editor
          height="220px"
          language="sql"
          theme="vs"
          value={value}
          onChange={(next) => onChange(next ?? '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly: disabled
          }}
        />
      </div>
    </div>
  )
}
