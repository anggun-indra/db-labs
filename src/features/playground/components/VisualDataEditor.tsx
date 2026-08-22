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
  Typography
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
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

/**
 * Visual row editor (Phase 3): browse/add/edit/delete rows for a table.
 * Every mutation is executed as real SQL and the generated statement is
 * shown, so students always see what happens under the hood (spec §16).
 */
export function VisualDataEditor({ schema }: { schema: TableInfo[] }) {
  const [tableName, setTableName] = useState<string | null>(null)
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [rows, setRows] = useState<EditorRow[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; rowid?: number } | null>(null)
  const [formTick, setFormTick] = useState(0)
  const [form] = Form.useForm()

  const recordMutation = usePlaygroundStore((s) => s.recordMutation)

  const table = useMemo(
    () => schema.find((t) => t.name === tableName) ?? null,
    [schema, tableName]
  )

  useEffect(() => {
    if (!tableName && schema.length > 0) setTableName(schema[0].name)
  }, [schema, tableName])

  useEffect(() => {
    setOffset(0)
  }, [tableName])

  const loadRows = useCallback(async (name: string, pageOffset: number) => {
    setLoading(true)
    setError(null)
    const result = await sqliteService.execute(buildSelectRows(name, PAGE_SIZE, pageOffset))
    setLoading(false)
    if (result.kind === 'rows') {
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
          values: cols
            .map((_, i) => row[i])
            .filter((_, i) => cols[i] !== ROWID_ALIAS)
        }))
      )
    } else {
      setError(
        result.kind === 'error'
          ? result.error?.raw ?? 'Could not load rows.'
          : 'Expected a query result but the statement did not return rows.'
      )
      setRows([])
    }
  }, [table])

  useEffect(() => {
    if (tableName) void loadRows(tableName, offset)
  }, [tableName, offset, loadRows])

  const displayColumns = columns.filter((c) => c.name !== ROWID_ALIAS)

  const openAdd = () => {
    form.resetFields()
    setModal({ mode: 'add' })
  }

  const openEdit = (row: EditorRow) => {
    const initial: Record<string, string> = {}
    displayColumns.forEach((column, index) => {
      const value = row.values[index]
      initial[column.name] = value === null || value === undefined ? '' : String(value)
    })
    form.setFieldsValue(initial)
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
    const values = displayColumns.map((column) => String(form.getFieldValue(column.name) ?? ''))
    const sql =
      modal.mode === 'add'
        ? buildInsert(table.name, displayColumns, values)
        : buildUpdateByRowid(table.name, displayColumns, values, modal.rowid ?? 0)
    await recordMutation(sql)
    setModal(null)
    if (tableName) await loadRows(tableName, offset)
  }

  const handleDelete = async (row: EditorRow) => {
    if (!table) return
    await recordMutation(buildDeleteByRowid(table.name, row.rowid))
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
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd} disabled={!table}>
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

      {error && <Alert type="error" showIcon message={error} />}

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
              title: `${column.name}${column.pk ? ' (PK)' : ''}`,
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

      <Modal
        title={modal?.mode === 'add' ? `Add row to ${table?.name}` : `Edit row in ${table?.name}`}
        open={modal !== null}
        onCancel={() => setModal(null)}
        onOk={() => void handleConfirm()}
        okText={modal?.mode === 'add' ? 'Insert row' : 'Save changes'}
      >
        <Form form={form} layout="vertical" onValuesChange={() => setFormTick((tick) => tick + 1)}>
          {displayColumns.map((column) => (
            <Form.Item
              key={column.name}
              name={column.name}
              label={
                <span>
                  {column.name} <Typography.Text type="secondary">({column.type || 'any'})</Typography.Text>
                </span>
              }
            >
              <Input placeholder="empty = NULL" />
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
