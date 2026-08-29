import { useCallback, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Button, Dropdown, Space, Tooltip, type MenuProps } from 'antd'
import {
  ClearOutlined,
  DownOutlined,
  FormatPainterOutlined,
  PlayCircleOutlined,
  SnippetsOutlined
} from '@ant-design/icons'
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
 * Basic SQL formatter for educational SQL console.
 * Normalizes keywords and places major clauses on separate lines.
 */
function formatSimpleSql(sql: string): string {
  if (!sql.trim()) return sql

  // Major clauses that should start on a new line
  const clauses = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'INNER JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'FULL JOIN',
    'JOIN',
    'INSERT INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE FROM',
    'CREATE TABLE',
    'DROP TABLE'
  ]

  let formatted = sql.trim()

  for (const clause of clauses) {
    const regex = new RegExp(`\\b${clause}\\b`, 'gi')
    formatted = formatted.replace(regex, (match) => match.toUpperCase())
  }

  return formatted
}

/**
 * Monaco SQL editor (Phase 3): run selection if there is one, otherwise run
 * the whole content. Ctrl/Cmd+Enter runs from the keyboard. Includes format,
 * clear, and quick educational snippets.
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

  const handleFormat = () => {
    const editor = editorRef.current
    if (!editor) return
    const current = editor.getValue()
    const formatted = formatSimpleSql(current)
    onChange(formatted)
  }

  const insertSnippet = (snippetText: string) => {
    const editor = editorRef.current
    if (!editor) {
      onChange(snippetText)
      return
    }
    const selection = editor.getSelection()
    if (selection) {
      editor.executeEdits('snippet', [
        { range: selection, text: snippetText, forceMoveMarkers: true }
      ])
    } else {
      const current = editor.getValue()
      const next = current.trim().length > 0 ? `${current}\n\n${snippetText}` : snippetText
      onChange(next)
    }
  }

  const snippetMenuItems: MenuProps['items'] = [
    {
      key: 'select_all',
      label: 'SELECT * FROM table LIMIT 50;',
      onClick: () => insertSnippet('SELECT * FROM table_name LIMIT 50;')
    },
    {
      key: 'select_join',
      label: 'SELECT ... JOIN ... ON ...',
      onClick: () =>
        insertSnippet('SELECT a.*, b.*\nFROM table_a a\nJOIN table_b b ON a.b_id = b.id\nLIMIT 50;')
    },
    {
      key: 'select_group_by',
      label: 'SELECT ... COUNT(*) GROUP BY ...',
      onClick: () =>
        insertSnippet(
          'SELECT category, COUNT(*) AS count, AVG(amount) AS avg_amount\nFROM records\nGROUP BY category\nHAVING COUNT(*) > 1\nORDER BY count DESC;'
        )
    },
    { type: 'divider' },
    {
      key: 'insert_row',
      label: 'INSERT INTO table (col1, col2) VALUES (...);',
      onClick: () => insertSnippet("INSERT INTO table_name (col1, col2) VALUES ('val1', 'val2');")
    },
    {
      key: 'update_row',
      label: 'UPDATE table SET col = val WHERE condition;',
      onClick: () => insertSnippet("UPDATE table_name SET column_name = 'new_value' WHERE id = 1;")
    },
    {
      key: 'delete_row',
      label: 'DELETE FROM table WHERE condition;',
      onClick: () => insertSnippet('DELETE FROM table_name WHERE id = 1;')
    },
    { type: 'divider' },
    {
      key: 'pragma_table_info',
      label: 'PRAGMA table_info(table);',
      onClick: () => insertSnippet('PRAGMA table_info(table_name);')
    }
  ]

  return (
    <div className="sql-editor">
      <div className="sql-editor__toolbar">
        <Space wrap size="small">
          <Tooltip title="Run selection, or whole script (Ctrl/Cmd+Enter)">
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
          <Tooltip title="Format and capitalize SQL keywords">
            <Button
              icon={<FormatPainterOutlined />}
              onClick={handleFormat}
              disabled={disabled || !value.trim()}
            >
              Format
            </Button>
          </Tooltip>
          <Dropdown menu={{ items: snippetMenuItems }} trigger={['click']} disabled={disabled}>
            <Button icon={<SnippetsOutlined />}>
              Snippets <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
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
            readOnly: disabled,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true
            },
            tabCompletion: 'on',
            snippetSuggestions: 'inline',
            wordBasedSuggestions: 'off',
            suggest: {
              showWords: false,
              showClasses: true,
              showFields: true,
              showFunctions: true,
              showKeywords: true,
              showSnippets: true,
              preview: true
            }
          }}
        />
      </div>
    </div>
  )
}
