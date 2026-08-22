/**
 * Database management interface (Phase 6+).
 * Beyond just viewing structure - lets students INSERT, UPDATE, DELETE data
 * like a real database management tool.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Divider, Drawer, Form, Input, message, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography, InputNumber, DatePicker } from 'antd'
import { 
  DatabaseOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, 
  ArrowUpOutlined, ArrowDownOutlined, SaveOutlined, ReloadOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useProjectDbStore } from '@/stores/projectDbStore'
import dayjs from 'dayjs'

export function DatabaseManagementPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  
  const { openFor, status, error, schema, drift, loadFromBytes, bytes } = useProjectDbStore()
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<ColumnsType<any>>([])
  const [insertModalOpen, setInsertModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<any>(null)
  const [rowsToDelete, setRowsToDelete] = useState<number[]>([])
  const [form] = Form.useForm()

  // Load data for active table
  useEffect(() => {
    if (!projectId || !activeTable) return
    
    try {
      const db = getSQLiteConnection()
      const query = `SELECT * FROM "${activeTable}" LIMIT 100`
      const result = db.exec(query)
      
      if (result.length > 0) {
        const cols = result[0].names
        const values = result[0].values
        
        const mapped = values.map((rowVals, idx) => {
          const row = { __index: idx }
          cols.forEach((col, i) => {
            row[col] = rowVals[i]
          })
          return row
        })
        
        setData(mapped)
        
        const colDefs: ColumnsType<any> = cols.map(col => ({
          title: col,
          dataIndex: col,
          key: col,
          width: 150
        }))
        
        setColumns(colDefs)
      } else {
        setData([])
        setColumns([])
      }
    } catch (error) {
      console.error(error)
      message.error('Failed to load table data')
    }
  }, [projectId, activeTable])

  async function handleInsert() {
    try {
      const values = await form.validateFields()
      const db = getSQLiteConnection()
      
      const columns = Object.keys(values)
      const placeholders = columns.map(() => '?').join(', ')
      const sql = `INSERT INTO "${activeTable}" (${columns.join(',')}) VALUES (${placeholders})`
      
      db.run(sql, Object.values(values))
      
      message.success('Record inserted successfully!')
      setInsertModalOpen(false)
      form.resetFields()
      
      // Refresh data
      useEffect(() => { /* trigger reload */ }, [activeTable])
    } catch (error) {
      console.error(error)
      message.error('Failed to insert record')
    }
  }

  async function handleUpdate() {
    try {
      const db = getSQLiteConnection()
      const pk = getPrimaryKey(activeTable!)
      
      const updates = []
      Object.keys(editingRow).forEach(key => {
        if (key !== pk && key !== '__index') {
          const value = editingRow[key]
          if (value !== null && value !== undefined) {
            updates.push(`"${key}" = ${typeof value === 'string' ? `'${value}'` : value}`)
          }
        }
      })
      
      const pkValue = editingRow[pk]
      const sql = `UPDATE "${activeTable}" SET ${updates.join(', ')} WHERE "${pk}" = '${pkValue}'`
      
      db.run(sql)
      
      message.success('Record updated successfully!')
      setEditModalOpen(false)
      setEditingRow(null)
      
      // Refresh data
      useEffect(() => { /* trigger reload */ }, [activeTable])
    } catch (error) {
      console.error(error)
      message.error('Failed to update record')
    }
  }

  async function handleDelete() {
    try {
      const db = getSQLiteConnection()
      const pk = getPrimaryKey(activeTable!)
      
      rowsToDelete.forEach(rowIdx => {
        const row = data[rowIdx]
        const pkValue = row[pk]
        db.run(`DELETE FROM "${activeTable}" WHERE "${pk}" = '${pkValue}'`)
      })
      
      message.success(`${rowsToDelete.length} record(s) deleted!`)
      setDeleteModalOpen(false)
      setRowsToDelete([])
      
      // Refresh data
      useEffect(() => { /* trigger reload */ }, [activeTable])
    } catch (error) {
      console.error(error)
      message.error('Failed to delete records')
    }
  }

  function getSQLiteConnection() {
    // This is simplified - in production use your sqlite.js wrapper
    return window.sqlPromise.then(sql => {
      const db = new sql.Database(bytes)
      return db
    })
  }

  function getPrimaryKey(tableName: string): string {
    // Get PK column name from schema
    const tableSchema = schema.find(t => t.tableName === tableName)
    if (tableSchema && tableSchema.columns.some(c => c.isPk)) {
      return tableSchema.columns.find(c => c.isPk)?.name || ''
    }
    return 'id' // fallback
  }

  function prepareColumnDefinition(column: any): any {
    const typeMap: Record<string, any> = {
      INTEGER: InputNumber,
      REAL: InputNumber,
      TEXT: Input,
      DATE: () => Input, // Simplified
      DATETIME: () => Input // Could use DatePicker
    }
    
    const type = column.sqliteType?.toUpperCase() || 'TEXT'
    const Component = typeMap[type] || Input
    
    return {
      ...Component,
      placeholder: column.nullable ? 'Optional' : 'Required',
      disabled: column.isPk
    }
  }

  const hasData = data.length > 0

  return (
    <div className="database-management-page">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Header */}
        <Card title={<><DatabaseOutlined /> Database Manager</>} extra={
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            Refresh
          </Button>
        }>
          <Typography.Paragraph type="secondary">
            View, insert, update, and delete data directly from your SQLite database.
            Changes are permanent until you reset the database.
          </Typography.Paragraph>
        </Card>

        {/* Table Selector */}
        <Card title="Select Table" bodyStyle={{ padding: '16px 24px' }}>
          <Space wrap>
            {(schema || []).map(table => (
              <Tag
                key={table.tableName}
                color={activeTable === table.tableName ? 'blue' : 'default'}
                icon={<DatabaseOutlined />}
                closable={activeTable !== table.tableName}
                onClose={() => setActiveTable(null)}
                onClick={() => setActiveTable(table.tableName)}
                style={{ cursor: 'pointer', fontSize: 14 }}
              >
                {table.tableName} ({table.columns.length} columns)
              </Tag>
            ))}
          </Space>
        </Card>

        {/* Data View */}
        {activeTable && hasData && (
          <Card 
            title={activeTable}
            extra={
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setInsertModalOpen(true)}
                >
                  Add Record
                </Button>
                <Popconfirm
                  title="Delete Records"
                  description="Are you sure you want to delete selected records?"
                  onConfirm={handleDelete}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Button danger icon={<DeleteOutlined />} disabled={rowsToDelete.length === 0}>
                    Delete Selected ({rowsToDelete.length})
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Table
              dataSource={data}
              columns={[
                { title: '#', dataIndex: '__index', key: '__index', width: 60 },
                ...columns.filter(c => c.dataIndex !== '__index')
              ]}
              rowSelection={{
                selectedRowKeys: rowsToDelete,
                onChange: (selected) => setRowsToDelete(selected)
              }}
              pagination={{ pageSize: 50 }}
              scroll={{ x: 800 }}
            />
          </Card>
        )}

        {activeTable && !hasData && (
          <Card>
            <Typography.Text type="secondary">No data in this table yet.</Typography.Text>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setInsertModalOpen(true)}
              style={{ marginTop: 16 }}
            >
              Create First Record
            </Button>
          </Card>
        )}

        {/* Insert Modal */}
        <Drawer
          title={`Insert into ${activeTable}`}
          placement="right"
          width={500}
          open={insertModalOpen}
          onClose={() => setInsertModalOpen(false)}
        >
          <Form form={form} layout="vertical">
            {columns.map(col => {
              const colDef = schema?.find(t => t.tableName === activeTable)?.columns.find(c => c.name === col.dataIndex)
              const FieldComp = prepareColumnDefinition(colDef!)
              
              return (
                <Form.Item
                  key={col.dataIndex}
                  label={colDef?.name || col.dataIndex}
                  rules={[{ required: !colDef?.nullable, message: 'This field is required!' }]}
                >
                  <FieldComp 
                    disabled={colDef?.isPk}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )
            })}
            <Divider />
            <Space>
              <Button onClick={() => setInsertModalOpen(false)}>Cancel</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleInsert}>
                Save Record
              </Button>
            </Space>
          </Form>
        </Drawer>

        {/* Update Modal */}
        <Drawer
          title={`Update record`}
          placement="right"
          width={500}
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
        >
          <Form form={form} layout="vertical">
            {columns.map(col => {
              const colDef = schema?.find(t => t.tableName === activeTable)?.columns.find(c => c.name === col.dataIndex)
              const FieldComp = prepareColumnDefinition(colDef!)
              
              return (
                <Form.Item
                  key={col.dataIndex}
                  label={colDef?.name || col.dataIndex}
                >
                  <FieldComp 
                    defaultValue={editingRow?.[col.dataIndex]}
                    disabled={colDef?.isPk}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )
            })}
            <Divider />
            <Space>
              <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleUpdate}>
                Update Record
              </Button>
            </Space>
          </Form>
        </Drawer>

        {/* Help Panel */}
        <Alert
          message="💡 Pro Tip"
          description="Use this interface to test SQL queries and see how data changes in real-time. Remember: every modification affects your assignment submission!"
          type="info"
          showIcon
        />
      </Space>
    </div>
  )
}
