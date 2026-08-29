import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography
} from 'antd'
import {
  BulbOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { sqliteService } from '@/lib/sqlite/sqlJsRuntime'
import type { ColumnInfo, TableInfo } from '@/lib/sqlite/schemaIntrospect'
import {
  buildDeleteByRowid,
  buildInsert,
  buildSelectRows,
  buildUpdateByRowid,
  ROWID_ALIAS
} from '../domain/rowMutations'
import { usePlaygroundStore } from '../playgroundStore'
import { quoteIdentifier } from '@/lib/sqlite/identifier'

const PAGE_SIZE = 50

interface EditorRow {
  rowid: number
  values: unknown[]
}

interface OperationError {
  raw: string
  code?: string
  hint?: string
  executionTimeMs?: number
}

interface VisualDataEditorProps {
  schema: TableInfo[]
  selectedTable?: string | null
  onSelectTable?: (tableName: string) => void
}

/**
 * Visual row editor (Phase 3): browse/add/edit/delete rows for a table.
 * Every mutation is executed as real SQL and the generated statement is
 * shown, so students always see what happens under the hood (spec §16).
 * Errors (e.g. constraint violations on add/edit/delete) are explicitly
 * surfaced with execution time and educational hints.
 */
export function VisualDataEditor({ schema, selectedTable, onSelectTable }: VisualDataEditorProps) {
  const [internalTableName, setInternalTableName] = useState<string | null>(null)
  const tableName = selectedTable ?? internalTableName

  const setTableName = useCallback(
    (name: string) => {
      setInternalTableName(name)
      onSelectTable?.(name)
    },
    [onSelectTable]
  )

  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [rows, setRows] = useState<EditorRow[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pageError, setPageError] = useState<OperationError | null>(null)
  const [modalError, setModalError] = useState<OperationError | null>(null)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; rowid?: number } | null>(null)
  const [formTick, setFormTick] = useState(0)
  const [form] = Form.useForm()

  const recordMutation = usePlaygroundStore((s) => s.recordMutation)
  const lastMutationSql = usePlaygroundStore((s) => s.lastMutationSql)

  const table = useMemo(() => schema.find((t) => t.name === tableName) ?? null, [schema, tableName])

  useEffect(() => {
    if (!tableName && schema.length > 0) {
      setTableName(schema[0].name)
    }
  }, [schema, tableName, setTableName])

  useEffect(() => {
    if (selectedTable) {
      setInternalTableName(selectedTable)
    }
  }, [selectedTable])

  useEffect(() => {
    setOffset(0)
    setPageError(null)
  }, [tableName])

  const loadRows = useCallback(
    async (name: string, pageOffset: number) => {
      setLoading(true)
      const result = await sqliteService.execute(buildSelectRows(name, PAGE_SIZE, pageOffset))
      setLoading(false)
      if (result.kind === 'rows') {
        setPageError(null)
        const cols = result.columns ?? []
        const rowidIndex = cols.indexOf(ROWID_ALIAS)
        const tableCols = (table?.columns ?? []).length > 0 ? table!.columns : []
        setColumns(
          tableCols.length > 0
            ? tableCols
            : cols
                .filter((c) => c !== ROWID_ALIAS)
                .map((c) => ({ name: c, type: '', notnull: false, pk: false, defaultValue: null }))
        )
        setRows(
          (result.rows ?? []).map((row) => ({
            rowid: Number(row[rowidIndex]),
            values: cols.map((_, i) => row[i]).filter((_, i) => cols[i] !== ROWID_ALIAS)
          }))
        )
      } else {
        setPageError({
          raw:
            result.kind === 'error'
              ? (result.error?.raw ?? 'Could not load rows.')
              : 'Expected a query result but the statement did not return rows.',
          code: result.kind === 'error' ? result.error?.code : undefined,
          hint: result.kind === 'error' ? result.error?.hint : undefined,
          executionTimeMs: result.executionTimeMs
        })
        setRows([])
      }
    },
    [table]
  )

  useEffect(() => {
    if (tableName) void loadRows(tableName, offset)
  }, [tableName, offset, loadRows])

  const displayColumns = columns.filter((c) => c.name !== ROWID_ALIAS)

  const openAdd = () => {
    form.resetFields()
    setModalError(null)
    setModal({ mode: 'add' })
  }

  const openEdit = (row: EditorRow) => {
    const initial: Record<string, string> = {}
    displayColumns.forEach((column, index) => {
      const value = row.values[index]
      initial[column.name] = value === null || value === undefined ? '' : String(value)
    })
    form.setFieldsValue(initial)
    setModalError(null)
    setModal({ mode: 'edit', rowid: row.rowid })
  }

  const pendingSql = useMemo(() => {
    if (!modal || !table) return null
    const values = displayColumns.map((column) => String(form.getFieldValue(column.name) ?? ''))
    return modal.mode === 'add'
      ? buildInsert(table.name, displayColumns, values)
      : buildUpdateByRowid(table.name, displayColumns, values, modal.rowid ?? 0)
    // formTick intentionally forces recomputation while the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, table, displayColumns, form, formTick])

  const handleConfirm = async () => {
    if (!table || !modal) return
    setSubmitting(true)
    setModalError(null)
    const values = displayColumns.map((column) => String(form.getFieldValue(column.name) ?? ''))
    const sql =
      modal.mode === 'add'
        ? buildInsert(table.name, displayColumns, values)
        : buildUpdateByRowid(table.name, displayColumns, values, modal.rowid ?? 0)
    const result = await recordMutation(sql)
    setSubmitting(false)

    if (result.kind === 'error') {
      setModalError({
        raw: result.error?.raw ?? 'Execution failed.',
        code: result.error?.code,
        hint: result.error?.hint,
        executionTimeMs: result.executionTimeMs
      })
      return
    }

    setModal(null)
    setModalError(null)
    if (tableName) await loadRows(tableName, offset)
  }

  const handleDelete = async (row: EditorRow) => {
    if (!table) return
    setPageError(null)
    const result = await recordMutation(buildDeleteByRowid(table.name, row.rowid))
    if (result.kind === 'error') {
      setPageError({
        raw: result.error?.raw ?? 'Failed to delete row.',
        code: result.error?.code,
        hint: result.error?.hint,
        executionTimeMs: result.executionTimeMs
      })
      return
    }
    if (tableName) await loadRows(tableName, offset)
  }

  if (schema.length === 0) {
    return <Empty description="Create a database first to edit its data visually." />
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Space wrap>
        <Select
          size="small"
          style={{ minWidth: 200 }}
          placeholder="Choose a table"
          value={tableName ?? undefined}
          onChange={(value) => setTableName(value)}
          options={schema.map((t) => ({ value: t.name, label: `${t.name} (${t.rowCount} rows)` }))}
        />
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => tableName && void loadRows(tableName, offset)}
        >
          Refresh
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAdd}
          disabled={!table}
        >
          Add row
        </Button>
        {offset > 0 && (
          <Button size="small" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Previous
          </Button>
        )}
        <Typography.Text type="secondary">offset {offset}</Typography.Text>
        <Button
          size="small"
          disabled={rows.length < PAGE_SIZE}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next
        </Button>
      </Space>

      {pageError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setPageError(null)}
          message={
            <Space wrap size="small" align="center">
              <Typography.Text strong>{pageError.raw}</Typography.Text>
              {pageError.code && <Tag color="magenta">{pageError.code}</Tag>}
              {pageError.executionTimeMs !== undefined && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined /> {pageError.executionTimeMs.toFixed(1)} ms
                </Typography.Text>
              )}
            </Space>
          }
          description={
            pageError.hint ? (
              <div
                data-testid="page-error-hint"
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  marginTop: 6,
                  padding: '6px 8px',
                  background: 'rgba(250, 173, 20, 0.08)',
                  border: '1px solid rgba(250, 173, 20, 0.25)',
                  borderRadius: 6
                }}
              >
                <BulbOutlined style={{ color: '#d48806', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <Typography.Text
                    strong
                    style={{ color: '#d48806', display: 'block', fontSize: 12 }}
                  >
                    Educational Hint & Lab Solution:
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>{pageError.hint}</Typography.Text>
                </div>
              </div>
            ) : undefined
          }
        />
      )}

      {table && (
        <Table
          size="small"
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          rowKey={(row) => String(row.rowid)}
          dataSource={rows}
          columns={[
            ...displayColumns.map((column, columnIndex) => ({
              title: (
                <Space size={4}>
                  <span>{column.name}</span>
                  {column.pk && (
                    <Tag
                      color="gold"
                      style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}
                    >
                      PK
                    </Tag>
                  )}
                  {column.notnull && (
                    <Tag
                      color="volcano"
                      style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}
                    >
                      NOT NULL
                    </Tag>
                  )}
                </Space>
              ),
              render: (_: unknown, row: EditorRow) => {
                const value = row.values[columnIndex]
                return value === null ? (
                  <Typography.Text type="secondary" italic>
                    NULL
                  </Typography.Text>
                ) : (
                  String(value)
                )
              }
            })),
            {
              title: '',
              render: (_: unknown, row: EditorRow) => (
                <Space size={4}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
                  <Popconfirm
                    title="Delete this row?"
                    description={`Runs: DELETE FROM ${quoteIdentifier(table.name)} WHERE rowid = ${row.rowid};`}
                    onConfirm={() => void handleDelete(row)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      )}

      {lastMutationSql && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          message="Last generated mutation SQL"
          description={
            <pre className="ddl-preview__code" style={{ margin: 0 }}>
              {lastMutationSql}
            </pre>
          }
        />
      )}

      <Modal
        title={modal?.mode === 'add' ? `Add row to ${table?.name}` : `Edit row in ${table?.name}`}
        open={modal !== null}
        width="min(520px, 95vw)"
        onCancel={() => setModal(null)}
        onOk={() => void handleConfirm()}
        okText={modal?.mode === 'add' ? 'Insert row' : 'Save changes'}
        confirmLoading={submitting}
      >
        {modalError && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <Space wrap size="small" align="center">
                <Typography.Text strong>{modalError.raw}</Typography.Text>
                {modalError.code && <Tag color="magenta">{modalError.code}</Tag>}
                {modalError.executionTimeMs !== undefined && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined /> {modalError.executionTimeMs.toFixed(1)} ms
                  </Typography.Text>
                )}
              </Space>
            }
            description={
              modalError.hint ? (
                <div
                  data-testid="modal-error-hint"
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    marginTop: 8,
                    padding: '8px 10px',
                    background: 'rgba(250, 173, 20, 0.08)',
                    border: '1px solid rgba(250, 173, 20, 0.25)',
                    borderRadius: 6
                  }}
                >
                  <BulbOutlined style={{ color: '#d48806', marginTop: 3, flexShrink: 0 }} />
                  <div>
                    <Typography.Text
                      strong
                      style={{ color: '#d48806', display: 'block', marginBottom: 2 }}
                    >
                      Educational Hint & Lab Solution:
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12 }}>{modalError.hint}</Typography.Text>
                  </div>
                </div>
              ) : undefined
            }
          />
        )}

        <Form form={form} layout="vertical" onValuesChange={() => setFormTick((tick) => tick + 1)}>
          {displayColumns.map((column) => (
            <Form.Item
              key={column.name}
              name={column.name}
              label={
                <Space size="small">
                  <span>{column.name}</span>
                  <Typography.Text type="secondary">({column.type || 'any'})</Typography.Text>
                  {column.pk && (
                    <Tag
                      color="gold"
                      style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}
                    >
                      PK
                    </Tag>
                  )}
                  {column.notnull && (
                    <Tag
                      color="volcano"
                      style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}
                    >
                      NOT NULL
                    </Tag>
                  )}
                </Space>
              }
            >
              <Input
                placeholder={
                  column.notnull
                    ? 'Required value (NOT NULL)'
                    : column.defaultValue !== null
                      ? `Default: ${column.defaultValue}`
                      : 'empty = NULL'
                }
              />
            </Form.Item>
          ))}
        </Form>
        {pendingSql && (
          <div>
            <Typography.Text type="secondary">Generated SQL:</Typography.Text>
            <pre className="ddl-preview__code" data-testid="mutation-sql">
              {pendingSql}
            </pre>
          </div>
        )}
      </Modal>
    </Space>
  )
}
