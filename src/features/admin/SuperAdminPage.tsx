import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd'
import {
  ArrowUpOutlined,
  BookOutlined,
  ClearOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileSyncOutlined,
  HddOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import {
  getAdminUsageService,
  SPARK_STORAGE_LIMIT_BYTES,
  type AdminCourseItem,
  type AdminUserItem,
  type CollectionDocItem,
  type FirebaseQuotaUsage
} from './services/adminUsageService'
import { createFirebaseUserWithPassword } from './services/adminAuthService'
import type { UserRole } from '@/lib/firebase/cloudAdapter'
import { getRoleLabel } from '@/lib/firebase/roles'

const { Title, Text, Paragraph } = Typography

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function SuperAdminPage(): JSX.Element {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin =
    user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'lecturer'

  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'usage'

  // Usage Stats State
  const [usage, setUsage] = useState<FirebaseQuotaUsage | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [pruning, setPruning] = useState(false)

  // Users List State
  const [usersList, setUsersList] = useState<AdminUserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearchText, setUserSearchText] = useState('')
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [createUserForm] = Form.useForm()

  // Courses List State
  const [coursesList, setCoursesList] = useState<AdminCourseItem[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  // Explorer State
  const [selectedCollection, setSelectedCollection] = useState('sqliteSnapshots')
  const [explorerDocs, setExplorerDocs] = useState<CollectionDocItem[]>([])
  const [explorerLoading, setExplorerLoading] = useState(false)
  const [inspectDoc, setInspectDoc] = useState<CollectionDocItem | null>(null)

  const adminService = getAdminUsageService()

  const loadUsageStats = useCallback(async () => {
    try {
      setLoadingUsage(true)
      const data = await adminService.fetchUsageStatistics()
      setUsage(data)
    } catch (err) {
      console.error(err)
      message.error('Failed to load Firebase usage statistics')
    } finally {
      setLoadingUsage(false)
    }
  }, [adminService])

  const loadUsersList = useCallback(async () => {
    try {
      setLoadingUsers(true)
      const list = await adminService.fetchUsersList()
      setUsersList(list)
    } catch (err) {
      console.error(err)
      message.error('Failed to load users list')
    } finally {
      setLoadingUsers(false)
    }
  }, [adminService])

  const loadCoursesList = useCallback(async () => {
    try {
      setLoadingCourses(true)
      const list = await adminService.fetchCoursesList()
      setCoursesList(list)
    } catch (err) {
      console.error(err)
      message.error('Failed to load courses list')
    } finally {
      setLoadingCourses(false)
    }
  }, [adminService])

  const loadExplorerDocs = useCallback(
    async (colName: string) => {
      try {
        setExplorerLoading(true)
        const docs = await adminService.listCollectionDocuments(colName, 50)
        setExplorerDocs(docs)
      } catch (err) {
        console.error(err)
        message.error(`Failed to load documents for ${colName}`)
      } finally {
        setExplorerLoading(false)
      }
    },
    [adminService]
  )

  useEffect(() => {
    if (isSuperAdmin) {
      void loadUsageStats()
      void loadUsersList()
      void loadCoursesList()
      void loadExplorerDocs(selectedCollection)
    }
  }, [
    isSuperAdmin,
    loadUsageStats,
    loadUsersList,
    loadCoursesList,
    loadExplorerDocs,
    selectedCollection
  ])

  async function handlePruneManualSnapshots(): Promise<void> {
    try {
      setPruning(true)
      const res = await adminService.pruneManualSnapshots(1)
      message.success(
        `Prune complete: Removed ${res.prunedSnapshotsCount} old manual snapshots & ${res.prunedChunksCount} chunks (${formatBytes(res.freedBytes)} freed).`
      )
      await loadUsageStats()
      if (selectedCollection === 'sqliteSnapshots') {
        await loadExplorerDocs(selectedCollection)
      }
    } catch (err) {
      console.error(err)
      message.error(err instanceof Error ? err.message : 'Failed to prune snapshots')
    } finally {
      setPruning(false)
    }
  }

  function getFriendlyErrorMessage(err: unknown, defaultMsg: string): string {
    if (err instanceof Error) {
      if (
        err.message.includes('Missing or insufficient permissions') ||
        err.message.includes('permission-denied')
      ) {
        return `Izin ditolak (Missing permissions). Akun Anda (UID: ${user?.uid}) harus memiliki role 'super_admin' atau 'lecturer' di Firestore /users/${user?.uid}, dan firestore.rules terbaru harus sudah dideploy ke Firebase.`
      }
      return err.message
    }
    return defaultMsg
  }

  async function handleRoleChange(targetUid: string, newRole: UserRole): Promise<void> {
    try {
      await adminService.updateUserRole(targetUid, newRole)
      message.success(`Role pengguna berhasil diubah menjadi ${getRoleLabel(newRole)}`)
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, role: newRole } : u))
      )
    } catch (err) {
      console.error(err)
      message.error(getFriendlyErrorMessage(err, 'Failed to update role'))
    }
  }

  async function handleCreateUser(values: {
    displayName: string
    email: string
    role: UserRole
    password?: string
    uid?: string
  }): Promise<void> {
    try {
      setCreatingUser(true)
      const email = values.email.trim()
      const displayName = values.displayName.trim()
      const password = values.password?.trim() || 'password123'
      let finalUid = values.uid?.trim()

      if (!finalUid) {
        // Automatically create user in Firebase Authentication with Email/Password
        try {
          const authResult = await createFirebaseUserWithPassword({
            email,
            password,
            displayName
          })
          finalUid = authResult.uid
        } catch (authErr: unknown) {
          const fbErr = authErr as { code?: string; message?: string }
          if (fbErr.code === 'auth/email-already-in-use') {
            throw new Error(
              `Email ${email} sudah terdaftar di Firebase Authentication. Anda dapat memasukkan UID secara manual jika ingin menghubungkan profil.`
            )
          }
          if (fbErr.code === 'auth/weak-password') {
            throw new Error('Password terlalu lemah. Minimal 6 karakter.')
          }
          throw new Error(fbErr.message || 'Gagal mendaftarkan akun di Firebase Authentication.')
        }
      }

      await adminService.createUserProfile({
        uid: finalUid,
        displayName,
        email,
        role: values.role,
        createdAt: new Date().toISOString()
      })

      message.success(
        `Pengguna ${displayName} (${getRoleLabel(values.role)}) berhasil didaftarkan di Firebase Auth & Firestore dengan password '${password}'.`
      )
      setCreateUserModalOpen(false)
      createUserForm.resetFields()
      await loadUsersList()
      await loadUsageStats()
    } catch (err) {
      console.error(err)
      message.error(getFriendlyErrorMessage(err, 'Gagal membuat pengguna baru'))
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleDeleteUser(targetUid: string): Promise<void> {
    try {
      await adminService.deleteDocument('users', targetUid)
      message.success(`Profil pengguna berhasil dihapus`)
      setUsersList((prev) => prev.filter((u) => u.uid !== targetUid))
      await loadUsageStats()
    } catch (err) {
      console.error(err)
      message.error(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  async function handleDeleteDocument(docItem: CollectionDocItem): Promise<void> {
    try {
      await adminService.deleteDocument(docItem.collectionName, docItem.id)
      message.success(`Deleted ${docItem.id} from ${docItem.collectionName}`)
      setExplorerDocs((prev) => prev.filter((d) => d.id !== docItem.id))
      await loadUsageStats()
    } catch (err) {
      console.error(err)
      message.error(err instanceof Error ? err.message : 'Failed to delete document')
    }
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="page-centered" style={{ padding: '60px 0' }}>
        <Result
          status="403"
          title="Super Admin Access Restricted"
          subTitle="Halaman ini hanya dapat diakses oleh Super Administrator untuk monitoring kuota sistem, manajemen instruktur/pengguna, dan kursus."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Kembali
            </Button>
          }
        />
      </div>
    )
  }

  const storageUsedMB = usage ? (usage.totalStorageBytes / (1024 * 1024)).toFixed(2) : '0'
  const progressStatus = !usage
    ? 'normal'
    : usage.usedStoragePercentage > 85
      ? 'exception'
      : usage.usedStoragePercentage > 60
        ? 'active'
        : 'success'

  const filteredUsers = usersList.filter((u) => {
    if (!userSearchText) return true
    const q = userSearchText.toLowerCase()
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  const superAdminCount = usersList.filter(
    (u) => u.role === 'super_admin' || u.role === 'admin'
  ).length
  const lecturerCount = usersList.filter((u) => u.role === 'lecturer').length
  const studentCount = usersList.filter((u) => u.role === 'student').length

  return (
    <div className="page-narrow" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <Space align="center" wrap>
            <SafetyCertificateOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Super Admin Management Hub
            </Title>
            <Tag color="purple">Spark Free Tier</Tag>
          </Space>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            Pantau statistik penggunaan kuota Firebase Spark, kelola pengguna (Instruktur, Peserta,
            Admin), kursus/kelas, serta pembersihan ruang database.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={loadingUsage || loadingUsers || loadingCourses}
          onClick={() => {
            void loadUsageStats()
            void loadUsersList()
            void loadCoursesList()
            void loadExplorerDocs(selectedCollection)
          }}
        >
          Scan & Refresh Data
        </Button>
      </div>

      {/* Active Admin Session Status */}
      <Card size="small" style={{ marginBottom: 20, background: 'var(--dsw-alias-bg-module-platform)' }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space wrap align="center">
              <Text strong>Akun Admin Aktif:</Text>
              <Text code copyable>{user?.uid || 'Not signed in'}</Text>
              <Tag color="purple">{user?.displayName || user?.email || 'Admin'}</Tag>
              <Tag color="blue">Role: {getRoleLabel(user?.role)}</Tag>
            </Space>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>
              🛡️ Diperlukan role <code>super_admin</code> atau <code>lecturer</code> di Firestore
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Hero Stats Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Space>
                  <HddOutlined />
                  <span>Firestore Storage Used</span>
                </Space>
              }
              value={`${storageUsedMB} MB`}
              suffix={`/ 1,024 MB`}
              valueStyle={{ fontSize: 20, fontWeight: 600, color: '#1677ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={usage?.usedStoragePercentage ?? 0}
                size="small"
                status={progressStatus}
                format={(p) => `${p}%`}
              />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Sisa Kuota: <strong>{usage?.remainingStorageMB ?? 1024} MB</strong>
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Space>
                  <TeamOutlined />
                  <span>Total Pengguna Terdaftar</span>
                </Space>
              }
              value={usersList.length}
              suffix="akun"
              valueStyle={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}
            />
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Tag color="purple">{superAdminCount} Super Admin</Tag>
              <Tag color="blue">{lecturerCount} Instruktur</Tag>
              <Tag color="green">{studentCount} Peserta</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Akun terdaftar di Firestore & Auth
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Space>
                  <BookOutlined />
                  <span>Total Kursus & Kelas</span>
                </Space>
              }
              value={coursesList.length}
              suffix="courses"
              valueStyle={{ fontSize: 20, fontWeight: 600, color: '#722ed1' }}
            />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Total Modul Tugas:{' '}
                <strong>{coursesList.reduce((acc, c) => acc + c.assignmentsCount, 0)} tugas</strong>
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total Peserta Terdaftar:{' '}
              <strong>{coursesList.reduce((acc, c) => acc + c.studentsCount, 0)} enrollment</strong>
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={
                <Space>
                  <CloudServerOutlined />
                  <span>Hosting & Concurrent</span>
                </Space>
              }
              value="10.00"
              suffix="GB / bulan"
              valueStyle={{ fontSize: 20, fontWeight: 600, color: '#fa8c16' }}
            />
            <div style={{ marginTop: 12 }}>
              <Space>
                <UsergroupAddOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Max User Simultan: <strong>100 User</strong>
                </Text>
              </Space>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Zero Egress on Local SQLite WASM
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Main Tabs */}
      <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs
          activeKey={currentTab}
          onChange={(key) => setSearchParams({ tab: key })}
          items={[
            {
              key: 'usage',
              label: (
                <span>
                  <DatabaseOutlined />
                  Usage & Kuota Sistem
                </span>
              ),
              children: (
                <div>
                  <Alert
                    type="success"
                    showIcon
                    message="Kapasitas Firebase Spark Plan Sangat Optimal"
                    description="Seluruh eksekusi query SQLite berjalan secara lokal di browser via WASM. Firestore hanya menyimpan snapshot terkompresi GZIP dan metadata, sehingga kuota gratis 1 GB masih tersisa sangat lapang."
                    style={{ marginBottom: 16 }}
                  />

                  {loadingUsage ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin size="large" tip="Memindai kuota Firestore..." />
                    </div>
                  ) : (
                    <Table
                      dataSource={usage?.collections ?? []}
                      rowKey="name"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        {
                          title: 'Koleksi Firestore',
                          dataIndex: 'label',
                          key: 'label',
                          render: (text: string, row) => (
                            <Space direction="vertical" size={2}>
                              <Space>
                                <Badge color="#1677ff" />
                                <Text strong>{text}</Text>
                                <Tag>{row.name}</Tag>
                              </Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {row.description}
                              </Text>
                            </Space>
                          )
                        },
                        {
                          title: 'Jumlah Dokumen',
                          dataIndex: 'count',
                          key: 'count',
                          width: 160,
                          render: (count: number) => (
                            <Tag color="cyan" style={{ fontSize: 13, padding: '2px 8px' }}>
                              {count.toLocaleString('id-ID')} docs
                            </Tag>
                          )
                        },
                        {
                          title: 'Estimasi Ukuran',
                          dataIndex: 'estimatedBytes',
                          key: 'estimatedBytes',
                          width: 160,
                          render: (bytes: number) => (
                            <Text strong style={{ color: '#1677ff' }}>
                              {formatBytes(bytes)}
                            </Text>
                          )
                        },
                        {
                          title: 'Porsi dari 1 GB',
                          key: 'percentage',
                          width: 180,
                          render: (_, row) => {
                            const pct = (
                              (row.estimatedBytes / SPARK_STORAGE_LIMIT_BYTES) *
                              100
                            ).toFixed(3)
                            return (
                              <Space direction="vertical" style={{ width: '100%' }} size={2}>
                                <Progress percent={parseFloat(pct)} size="small" />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {pct}% dari 1 GB
                                </Text>
                              </Space>
                            )
                          }
                        }
                      ]}
                    />
                  )}

                  <Divider />
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card
                        title={
                          <Space>
                            <FileSyncOutlined style={{ color: '#1677ff' }} />
                            <span>Pembersihan Snapshot Manual (Prune)</span>
                          </Space>
                        }
                        extra={<Tag color="blue">Hemat Storage</Tag>}
                      >
                        <Paragraph type="secondary" style={{ minHeight: 40 }}>
                          Menghapus snapshot draft lokal lama peserta dan mempertahankan 1 snapshot
                          manual terbaru per project.{' '}
                          <strong>
                            Snapshot pengumpulan tugas resmi (submissions) tetap terjaga aman.
                          </strong>
                        </Paragraph>
                        <Popconfirm
                          title="Prune Snapshot Manual?"
                          description="Tindakan ini akan membersihkan snapshot draft lama per project."
                          onConfirm={() => void handlePruneManualSnapshots()}
                          okText="Jalankan Prune"
                          cancelText="Batal"
                        >
                          <Button type="primary" icon={<ClearOutlined />} loading={pruning} block>
                            Jalankan Prune Snapshot Manual
                          </Button>
                        </Popconfirm>
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card
                        title={
                          <Space>
                            <ThunderboltOutlined style={{ color: '#fa8c16' }} />
                            <span>Batas Operasi Harian Spark Plan</span>
                          </Space>
                        }
                        extra={<Tag color="orange">Free Tier Quotas</Tag>}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Firestore Reads">
                            {usage?.dailyReadsLimit.toLocaleString('id-ID')} / hari
                          </Descriptions.Item>
                          <Descriptions.Item label="Firestore Writes">
                            {usage?.dailyWritesLimit.toLocaleString('id-ID')} / hari
                          </Descriptions.Item>
                          <Descriptions.Item label="Firestore Deletes">
                            {usage?.dailyDeletesLimit.toLocaleString('id-ID')} / hari
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'users',
              label: (
                <span>
                  <TeamOutlined />
                  List Pengguna ({usersList.length})
                </span>
              ),
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    <Input
                      placeholder="Cari pengguna berdasarkan Nama, Email, UID, atau Role..."
                      prefix={<SearchOutlined />}
                      value={userSearchText}
                      onChange={(e) => setUserSearchText(e.target.value)}
                      style={{ maxWidth: 380, flex: '1 1 240px' }}
                      allowClear
                    />
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateUserModalOpen(true)}
                      >
                        Tambah Pengguna Baru
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        loading={loadingUsers}
                        onClick={() => void loadUsersList()}
                      >
                        Refresh
                      </Button>
                    </Space>
                  </div>

                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Ketentuan Pendaftaran & Role Pengguna"
                    description="Pendaftaran otomatis publik hanya berlaku untuk pengguna yang masuk via Google Auth (otomatis berstatus Peserta). Akun berbasis Email & Password harus didaftarkan di sini oleh Super Admin atau dibuat di Firebase Console."
                  />

                  {loadingUsers ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin size="large" tip="Memuat daftar pengguna..." />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <Empty description="Tidak ada pengguna ditemukan" />
                  ) : (
                    <Table
                      dataSource={filteredUsers}
                      rowKey="uid"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        {
                          title: 'Nama Pengguna',
                          key: 'displayName',
                          render: (_, row) => (
                            <Space direction="vertical" size={0}>
                              <Text strong>{row.displayName || 'Tanpa Nama'}</Text>
                              <Text
                                type="secondary"
                                copyable={{ text: row.uid }}
                                style={{ fontSize: 11 }}
                              >
                                UID: {row.uid}
                              </Text>
                            </Space>
                          )
                        },
                        {
                          title: 'Email',
                          dataIndex: 'email',
                          key: 'email',
                          render: (email: string) => (email ? <Text copyable>{email}</Text> : '-')
                        },
                        {
                          title: 'Role / Peran',
                          dataIndex: 'role',
                          key: 'role',
                          width: 200,
                          render: (r: UserRole, row) => (
                            <Select
                              value={r}
                              size="small"
                              style={{ width: 180 }}
                              onChange={(newRole) =>
                                void handleRoleChange(row.uid, newRole as UserRole)
                              }
                              options={[
                                { value: 'student', label: '🎓 Peserta / Student' },
                                { value: 'lecturer', label: '👨‍🏫 Instruktur / Lecturer' },
                                { value: 'super_admin', label: '🛡️ Super Admin' }
                              ]}
                            />
                          )
                        },
                        {
                          title: 'Terdaftar Sejak',
                          dataIndex: 'createdAt',
                          key: 'createdAt',
                          width: 170,
                          render: (d: string) =>
                            d
                              ? new Date(d).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '-'
                        },
                        {
                          title: 'Aksi Cepat',
                          key: 'actions',
                          width: 180,
                          render: (_, row) => (
                            <Space size="small">
                              {row.role === 'student' && (
                                <Popconfirm
                                  title="Promote menjadi Instruktur?"
                                  description={`Jadikan ${row.displayName || row.email} sebagai Instruktur (Lecturer) dengan hak membuat & menilai tugas.`}
                                  onConfirm={() => void handleRoleChange(row.uid, 'lecturer')}
                                  okText="Promote"
                                  cancelText="Batal"
                                >
                                  <Button
                                    size="small"
                                    type="primary"
                                    ghost
                                    icon={<ArrowUpOutlined />}
                                  >
                                    Promote
                                  </Button>
                                </Popconfirm>
                              )}
                              <Popconfirm
                                title="Hapus pengguna ini?"
                                description="Profil pengguna di Firestore akan dihapus permanen."
                                onConfirm={() => void handleDeleteUser(row.uid)}
                                okText="Hapus"
                                cancelText="Batal"
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          )
                        }
                      ]}
                    />
                  )}
                </div>
              )
            },
            {
              key: 'courses',
              label: (
                <span>
                  <BookOutlined />
                  List Kursus & Kelas ({coursesList.length})
                </span>
              ),
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16
                    }}
                  >
                    <Text type="secondary">
                      Daftar seluruh kursus dan kelas praktikum yang terdaftar di sistem.
                    </Text>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={loadingCourses}
                      onClick={() => void loadCoursesList()}
                    >
                      Refresh
                    </Button>
                  </div>

                  {loadingCourses ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin size="large" tip="Memuat daftar kursus..." />
                    </div>
                  ) : coursesList.length === 0 ? (
                    <Empty description="Belum ada kursus terdaftar" />
                  ) : (
                    <Table
                      dataSource={coursesList}
                      rowKey="courseId"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        {
                          title: 'Kursus / Kelas',
                          key: 'title',
                          render: (_, row) => (
                            <Space direction="vertical" size={2}>
                              <Link to={`/courses/${row.courseId}`}>
                                <Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                                  {row.title}
                                </Text>
                              </Link>
                              <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                                {row.description}
                              </Text>
                              <Text code style={{ fontSize: 11 }}>
                                {row.courseId}
                              </Text>
                            </Space>
                          )
                        },
                        {
                          title: 'Instruktur Pengampu',
                          key: 'lecturer',
                          width: 200,
                          render: (_, row) => (
                            <Space direction="vertical" size={0}>
                              <Text>{row.lecturerName || 'Instruktur'}</Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: 11 }}
                                copyable={{ text: row.lecturerUid }}
                              >
                                {row.lecturerUid.slice(0, 10)}...
                              </Text>
                            </Space>
                          )
                        },
                        {
                          title: 'Modul Tugas',
                          dataIndex: 'assignmentsCount',
                          key: 'assignmentsCount',
                          width: 140,
                          render: (count: number) => <Tag color="blue">{count} Tugas</Tag>
                        },
                        {
                          title: 'Peserta Terdaftar',
                          dataIndex: 'studentsCount',
                          key: 'studentsCount',
                          width: 160,
                          render: (count: number) => <Tag color="green">{count} Peserta</Tag>
                        },
                        {
                          title: 'Aksi',
                          key: 'actions',
                          width: 120,
                          render: (_, row) => (
                            <Link to={`/courses/${row.courseId}`}>
                              <Button size="small" type="primary" ghost>
                                Buka Kursus
                              </Button>
                            </Link>
                          )
                        }
                      ]}
                    />
                  )}
                </div>
              )
            },
            {
              key: 'explorer',
              label: (
                <span>
                  <HddOutlined />
                  Live Collection Explorer
                </span>
              ),
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16
                    }}
                  >
                    <Space align="center">
                      <Text strong>Pilih Koleksi:</Text>
                      <Select
                        value={selectedCollection}
                        onChange={(val) => {
                          setSelectedCollection(val)
                          void loadExplorerDocs(val)
                        }}
                        style={{ width: 240 }}
                        options={[
                          { value: 'sqliteSnapshots', label: 'sqliteSnapshots (Binary DBs)' },
                          { value: 'projects', label: 'projects (ERD Models)' },
                          { value: 'submissions', label: 'submissions (Tugas Masuk)' },
                          { value: 'assignments', label: 'assignments (Modul Tugas)' },
                          { value: 'courses', label: 'courses (Kursus & Kelas)' },
                          { value: 'users', label: 'users (Pengguna)' },
                          { value: 'taskProgress', label: 'taskProgress (Progres Peserta)' },
                          {
                            value: 'courseMemberships',
                            label: 'courseMemberships (Enrollments)'
                          }
                        ]}
                      />
                    </Space>
                    <Tag color="blue">{explorerDocs.length} dokumen ditampilkan</Tag>
                  </div>

                  {explorerLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="Memuat dokumen koleksi..." />
                    </div>
                  ) : explorerDocs.length === 0 ? (
                    <Empty description={`Belum ada dokumen di koleksi ${selectedCollection}`} />
                  ) : (
                    <Table
                      dataSource={explorerDocs}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        {
                          title: 'Document ID',
                          dataIndex: 'id',
                          key: 'id',
                          render: (id: string) => (
                            <Text code copyable>
                              {id}
                            </Text>
                          )
                        },
                        {
                          title: 'Title / Label',
                          key: 'title',
                          render: (_, row) => row.title || row.name || '-'
                        },
                        {
                          title: 'Owner UID',
                          dataIndex: 'ownerUid',
                          key: 'ownerUid',
                          render: (uid?: string) =>
                            uid ? (
                              <Text type="secondary" copyable>
                                {uid.slice(0, 10)}...
                              </Text>
                            ) : (
                              '-'
                            )
                        },
                        {
                          title: 'Estimasi Ukuran',
                          dataIndex: 'sizeBytes',
                          key: 'sizeBytes',
                          render: (bytes: number) => <Tag color="blue">{formatBytes(bytes)}</Tag>
                        },
                        {
                          title: 'Aksi',
                          key: 'actions',
                          width: 150,
                          render: (_, row) => (
                            <Space>
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => setInspectDoc(row)}
                              >
                                Detail
                              </Button>
                              <Popconfirm
                                title="Hapus dokumen ini?"
                                description="Tindakan ini tidak dapat dibatalkan."
                                onConfirm={() => void handleDeleteDocument(row)}
                                okText="Hapus"
                                cancelText="Batal"
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          )
                        }
                      ]}
                    />
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="Tambah Pengguna Baru"
        open={createUserModalOpen}
        onCancel={() => setCreateUserModalOpen(false)}
        footer={null}
        destroyOnClose
        width="min(520px, 95vw)"
      >
        <Form
          form={createUserForm}
          layout="vertical"
          initialValues={{ role: 'lecturer', password: 'password123' }}
          onFinish={(values: {
            displayName: string
            email: string
            role: UserRole
            password?: string
            uid?: string
          }) => void handleCreateUser(values)}
        >
          <Form.Item
            label="Nama Lengkap / Display Name"
            name="displayName"
            rules={[{ required: true, message: 'Masukkan nama pengguna' }]}
          >
            <Input placeholder="Contoh: Dr. Budi Santoso / Instruktur Lab" />
          </Form.Item>

          <Form.Item
            label="Alamat Email"
            name="email"
            rules={[
              { required: true, message: 'Masukkan alamat email' },
              { type: 'email', message: 'Format email tidak valid' }
            ]}
          >
            <Input placeholder="instruktur@lembaga.ac.id" />
          </Form.Item>

          <Form.Item
            label="Password Akun (Provider Email/Password)"
            name="password"
            rules={[{ min: 6, message: 'Password minimal 6 karakter' }]}
            tooltip="Default password adalah 'password123'. Akun akan langsung dibuatkan di Firebase Authentication."
          >
            <Input.Password placeholder="password123" />
          </Form.Item>

          <Form.Item
            label="Role / Peran Pengguna"
            name="role"
            rules={[{ required: true, message: 'Pilih role pengguna' }]}
          >
            <Select
              options={[
                {
                  value: 'lecturer',
                  label: '👨‍🏫 Instruktur / Lecturer (Dapat membuat kelas & menilai tugas)'
                },
                {
                  value: 'student',
                  label: '🎓 Peserta / Student (Mengerjakan praktikum & mengumpulkan tugas)'
                },
                {
                  value: 'super_admin',
                  label: '🛡️ Super Admin (Akses penuh manajemen sistem)'
                }
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Custom Firebase UID (Opsional)"
            name="uid"
            tooltip="Hanya isi jika akun sudah dibuat di Firebase Auth Console dan Anda hanya ingin menghubungkan UID-nya ke profil Firestore."
          >
            <Input placeholder="Kosongkan untuk mendaftarkan akun Firebase Auth otomatis" />
          </Form.Item>

          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="Pendaftaran Otomatis Firebase Authentication"
            description="Akun akan langsung didaftarkan ke Firebase Authentication dengan provider Email/Password (default 'password123') dan tersimpan di Firestore. Pengguna dapat langsung login tanpa setup manual di Firebase Console."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateUserModalOpen(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={creatingUser}>
              Simpan Pengguna
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Inspect Document Modal */}
      <Modal
        title={`Inspeksi Dokumen: ${inspectDoc?.id || ''}`}
        open={inspectDoc !== null}
        onCancel={() => setInspectDoc(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setInspectDoc(null)}>
            Tutup
          </Button>
        ]}
        width="min(700px, 95vw)"
      >
        {inspectDoc && (
          <div>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Koleksi">{inspectDoc.collectionName}</Descriptions.Item>
              <Descriptions.Item label="ID Dokumen">{inspectDoc.id}</Descriptions.Item>
              <Descriptions.Item label="Estimasi Ukuran">
                {formatBytes(inspectDoc.sizeBytes)}
              </Descriptions.Item>
            </Descriptions>
            <Text strong>Isi Payload JSON:</Text>
            <pre
              style={{
                background: 'var(--dsw-alias-bg-layer-2)',
                padding: 12,
                borderRadius: 6,
                maxHeight: 350,
                overflow: 'auto',
                fontSize: 12,
                marginTop: 6
              }}
            >
              {JSON.stringify(inspectDoc.rawData, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  )
}
