import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Typography, Card, Row, Col, Button, Space, Tag, Divider, Empty, message, 
  Modal, Input, Form, Tabs, Popconfirm, Avatar, Spin 
} from 'antd'
import { 
  BookOutlined, CheckCircleOutlined, DatabaseOutlined, 
  UserOutlined, PlusOutlined, CopyOutlined, EditOutlined, 
  DeleteOutlined, EyeOutlined, AppstoreOutlined, LockOutlined 
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import type { Course } from '@/features/assignments/domain/assignmentModel'
import { getAssignmentService } from '@/lib/firebase/assignmentInstance'
import { getAdapters } from '@/lib/firebase/config'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface LecturerProfile {
  displayName?: string
  email?: string
}

export function CourseListPage(): JSX.Element {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [lecturerProfiles, setLecturerProfiles] = useState<Record<string, LecturerProfile>>({})
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [duplicatingCourse, setDuplicatingCourse] = useState<Course | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [duplicateForm] = Form.useForm()
  
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isLecturer = user?.role === 'lecturer' || user?.role === 'super_admin' || user?.role === 'admin'
  
  const [activeTab, setActiveTab] = useState<'my' | 'catalog'>('my')

  const loadCourses = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const list = await getAssignmentService().listCourses()
      setCourses(list)

      // Fetch lecturer profiles for creator attribution
      const uniqueUids = Array.from(new Set(list.map((c) => c.lecturerUid).filter(Boolean)))
      const adapters = getAdapters()
      if (adapters) {
        const profilesMap: Record<string, LecturerProfile> = {}
        await Promise.all(
          uniqueUids.map(async (uid) => {
            try {
              const p = await adapters.users.loadProfile(uid)
              if (p) {
                profilesMap[uid] = {
                  displayName: p.displayName,
                  email: p.email
                }
              }
            } catch {
              // ignore profile load error
            }
          })
        )
        setLecturerProfiles(profilesMap)
      }
    } catch (error) {
      console.error(error)
      message.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      void loadCourses()
    } else {
      setCourses([])
      setLoading(false)
    }
  }, [user, loadCourses])

  function getLecturerInfo(lecturerUid: string): { name: string; email: string; isSelf: boolean } {
    if (user && lecturerUid === user.uid) {
      return {
        name: user.displayName || user.email || 'Anda',
        email: user.email || '',
        isSelf: true
      }
    }
    const profile = lecturerProfiles[lecturerUid]
    if (profile) {
      return {
        name: profile.displayName || profile.email || `Instruktur (${lecturerUid.slice(0, 6)}...)`,
        email: profile.email || '',
        isSelf: false
      }
    }
    return {
      name: `Instruktur (${lecturerUid.slice(0, 6)}...)`,
      email: '',
      isSelf: false
    }
  }

  async function handleCreateCourse(values: { title: string; description: string }): Promise<void> {
    if (!user) {
      message.warning('Silakan login terlebih dahulu')
      return
    }
    if (!isLecturer) {
      message.error('Hanya instruktur yang dapat membuat kursus!')
      return
    }
    
    try {
      setActionLoading(true)
      const created = await getAssignmentService().createCourse({
        title: values.title.trim(),
        description: values.description?.trim()
      })
      setCourses((prev) => [created, ...prev])
      message.success(`Kursus "${values.title}" berhasil dibuat!`)
      createForm.resetFields()
      setShowCreateModal(false)
      setActiveTab('my')
    } catch (error) {
      console.error(error)
      message.error(error instanceof Error ? error.message : 'Gagal membuat kursus')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEditCourse(values: { title: string; description: string }): Promise<void> {
    if (!editingCourse) return
    try {
      setActionLoading(true)
      const updated = await getAssignmentService().updateCourse(editingCourse.courseId, {
        title: values.title.trim(),
        description: values.description?.trim()
      })
      setCourses((prev) => prev.map((c) => (c.courseId === updated.courseId ? updated : c)))
      message.success(`Kursus "${updated.title}" berhasil diperbarui!`)
      setEditingCourse(null)
      editForm.resetFields()
    } catch (error) {
      console.error(error)
      message.error(error instanceof Error ? error.message : 'Gagal memperbarui kursus')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDuplicateCourse(values: { title: string }): Promise<void> {
    if (!duplicatingCourse) return
    try {
      setActionLoading(true)
      const duplicated = await getAssignmentService().duplicateCourse(
        duplicatingCourse.courseId,
        values.title.trim()
      )
      setCourses((prev) => [duplicated, ...prev])
      message.success(`Kursus "${duplicated.title}" berhasil diduplikasi ke Kursus Saya!`)
      setDuplicatingCourse(null)
      duplicateForm.resetFields()
      setActiveTab('my')
    } catch (error) {
      console.error(error)
      message.error(error instanceof Error ? error.message : 'Gagal menduplikasi kursus')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteCourse(courseId: string, courseTitle: string): Promise<void> {
    try {
      await getAssignmentService().deleteCourse(courseId)
      setCourses((prev) => prev.filter((c) => c.courseId !== courseId))
      message.success(`Kursus "${courseTitle}" berhasil dihapus`)
    } catch (error) {
      console.error(error)
      message.error(error instanceof Error ? error.message : 'Gagal menghapus kursus')
    }
  }

  function handleJoin(courseId: string): void {
    if (!user) {
      void message.warning('Silakan login terlebih dahulu')
      return
    }
    void message.success(`Berhasil bergabung ke kursus ${courseId}!`)
  }

  // Filter courses
  const myCourses = courses.filter((c) => user && c.lecturerUid === user.uid)
  const otherCourses = courses.filter((c) => !user || c.lecturerUid !== user.uid)

  return (
    <div className="page-narrow" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header Card */}
        <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} sm={16}>
              <Space align="center" wrap>
                <BookOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                <Title level={3} style={{ margin: 0 }}>
                  Manajemen Kursus & Kelas
                </Title>
                {user && (
                  <Tag color={isLecturer ? 'purple' : 'blue'}>
                    <UserOutlined /> {isLecturer ? 'Instruktur (Lecturer)' : 'Mahasiswa (Student)'}
                  </Tag>
                )}
              </Space>
              <Paragraph type="secondary" style={{ margin: '6px 0 0 0' }}>
                {!user
                  ? 'Silakan login untuk melihat kelas dan praktikum database.'
                  : isLecturer
                  ? 'Kelola kelas praktikum Anda, atau duplikasi modul kursus dari instruktur lain.'
                  : 'Lihat daftar kursus praktikum yang Anda ikuti dan jelajahi katalog kursus.'}
              </Paragraph>
            </Col>
            {isLecturer && (
              <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => setShowCreateModal(true)}
                  style={{ width: '100%', maxWidth: 200 }}
                >
                  Buat Kursus Baru
                </Button>
              </Col>
            )}
          </Row>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Memuat daftar kursus...</Text>
            </div>
          </Card>
        )}

        {/* Lecturer View with Tabs */}
        {!loading && isLecturer && (
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as 'my' | 'catalog')}
            type="card"
            items={[
              {
                key: 'my',
                label: (
                  <Space>
                    <CheckCircleOutlined />
                    <span>Kursus Saya</span>
                    <Tag color="blue">{myCourses.length}</Tag>
                  </Space>
                ),
                children: (
                  <div style={{ marginTop: 8 }}>
                    {myCourses.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {myCourses.map((course) => {
                          const lecturer = getLecturerInfo(course.lecturerUid)
                          return (
                            <Col xs={24} sm={12} lg={8} key={course.courseId}>
                              <Card
                                hoverable
                                className="course-card"
                                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                              >
                                <div style={{ flex: 1 }}>
                                  <Title level={5} ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                                    {course.title}
                                  </Title>
                                  <Paragraph
                                    ellipsis={{ rows: 3 }}
                                    type="secondary"
                                    style={{ fontSize: 13, minHeight: 54 }}
                                  >
                                    {course.description || 'Belum ada deskripsi untuk kursus ini.'}
                                  </Paragraph>
                                </div>
                                <Divider style={{ margin: '12px 0 8px 0' }} />
                                <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                                  <Space wrap size="small">
                                    <Tag color="green">
                                      <CheckCircleOutlined /> Kursus Milik Anda
                                    </Tag>
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    <UserOutlined /> Pengampu: <strong>{lecturer.name}</strong>
                                  </Text>
                                </Space>

                                <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<EyeOutlined />}
                                    onClick={() => navigate(`/courses/${course.courseId}`)}
                                    style={{ flex: '1 1 80px' }}
                                  >
                                    Buka
                                  </Button>
                                  <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                      setEditingCourse(course)
                                      editForm.setFieldsValue({
                                        title: course.title,
                                        description: course.description
                                      })
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="small"
                                    icon={<CopyOutlined />}
                                    onClick={() => {
                                      setDuplicatingCourse(course)
                                      duplicateForm.setFieldsValue({
                                        title: `${course.title} (Salinan)`
                                      })
                                    }}
                                  >
                                    Klon
                                  </Button>
                                  <Popconfirm
                                    title="Hapus Kursus?"
                                    description={`Apakah Anda yakin ingin menghapus kursus "${course.title}"?`}
                                    okText="Ya, Hapus"
                                    cancelText="Batal"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => void handleDeleteCourse(course.courseId, course.title)}
                                  >
                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                </div>
                              </Card>
                            </Col>
                          )
                        })}
                      </Row>
                    ) : (
                      <Card style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={
                            <Space direction="vertical" size="small">
                              <Text strong>Anda belum memiliki kursus yang dibuat.</Text>
                              <Text type="secondary">
                                Buat kursus baru dari awal atau duplikasi kurikulum dari Katalog Kursus Lainnya.
                              </Text>
                            </Space>
                          }
                        >
                          <Space style={{ marginTop: 16 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                              Buat Kursus Baru
                            </Button>
                            {otherCourses.length > 0 && (
                              <Button icon={<AppstoreOutlined />} onClick={() => setActiveTab('catalog')}>
                                Jelajahi Katalog ({otherCourses.length})
                              </Button>
                            )}
                          </Space>
                        </Empty>
                      </Card>
                    )}
                  </div>
                )
              },
              {
                key: 'catalog',
                label: (
                  <Space>
                    <AppstoreOutlined />
                    <span>Katalog Kursus Lainnya</span>
                    <Tag color="default">{otherCourses.length}</Tag>
                  </Space>
                ),
                children: (
                  <div style={{ marginTop: 8 }}>
                    {otherCourses.length > 0 ? (
                      <>
                        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                          Kursus di bawah ini dibuat oleh instruktur lain. Anda dapat melihat modulnya dalam mode <em>Read-Only</em>, atau <strong>menduplikasikannya ke Kursus Saya</strong> untuk disesuaikan dengan kelas Anda.
                        </Paragraph>
                        <Row gutter={[16, 16]}>
                          {otherCourses.map((course) => {
                            const lecturer = getLecturerInfo(course.lecturerUid)
                            return (
                              <Col xs={24} sm={12} lg={8} key={course.courseId}>
                                <Card
                                  hoverable
                                  className="course-card"
                                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                  bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <Title level={5} ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                                      {course.title}
                                    </Title>
                                    <Paragraph
                                      ellipsis={{ rows: 3 }}
                                      type="secondary"
                                      style={{ fontSize: 13, minHeight: 54 }}
                                    >
                                      {course.description || 'Belum ada deskripsi untuk kursus ini.'}
                                    </Paragraph>
                                  </div>
                                  <Divider style={{ margin: '12px 0 8px 0' }} />
                                  <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                                    <Space wrap size="small">
                                      <Tag color="orange" icon={<LockOutlined />}>
                                        Read-Only
                                      </Tag>
                                      <Tag color="blue">Katalog</Tag>
                                    </Space>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                      <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1677ff' }} />
                                      <div style={{ overflow: 'hidden' }}>
                                        <Text strong style={{ fontSize: 12, display: 'block' }} ellipsis>
                                          {lecturer.name}
                                        </Text>
                                        {lecturer.email && (
                                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis>
                                            {lecturer.email}
                                          </Text>
                                        )}
                                      </div>
                                    </div>
                                  </Space>

                                  <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <Button
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => navigate(`/courses/${course.courseId}`)}
                                      style={{ flex: '1 1 90px' }}
                                    >
                                      Lihat Detail
                                    </Button>
                                    <Button
                                      size="small"
                                      type="primary"
                                      icon={<CopyOutlined />}
                                      onClick={() => {
                                        setDuplicatingCourse(course)
                                        duplicateForm.setFieldsValue({
                                          title: `${course.title} (Salinan)`
                                        })
                                      }}
                                      style={{ flex: '1 1 130px' }}
                                    >
                                      Duplikasi ke Kursus
                                    </Button>
                                  </div>
                                </Card>
                              </Col>
                            )
                          })}
                        </Row>
                      </>
                    ) : (
                      <Card style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Belum ada kursus dari instruktur lain di katalog."
                        />
                      </Card>
                    )}
                  </div>
                )
              }
            ]}
          />
        )}

        {/* Student View */}
        {!loading && !isLecturer && (
          <>
            {courses.length > 0 ? (
              <Card
                title={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>Daftar Kursus Praktikum ({courses.length})</span>
                  </Space>
                }
              >
                <Row gutter={[16, 16]}>
                  {courses.map((course) => {
                    const lecturer = getLecturerInfo(course.lecturerUid)
                    return (
                      <Col xs={24} sm={12} md={8} key={course.courseId}>
                        <Card
                          hoverable
                          className="course-card"
                          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                          bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                        >
                          <div style={{ flex: 1 }}>
                            <Title level={5} ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                              {course.title}
                            </Title>
                            <Paragraph ellipsis={{ rows: 3 }} type="secondary" style={{ fontSize: 13 }}>
                              {course.description || 'Belum ada deskripsi untuk kursus ini.'}
                            </Paragraph>
                          </div>
                          <Divider style={{ margin: '12px 0 8px 0' }} />
                          <Text type="secondary" style={{ fontSize: 12, marginBottom: 12, display: 'block' }}>
                            <UserOutlined /> Dosen Pengampu: <strong>{lecturer.name}</strong>
                          </Text>
                          <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <Link to={`/courses/${course.courseId}`} style={{ flex: '1 1 120px' }}>
                              <Button type="primary" size="small" block>
                                Buka Kursus →
                              </Button>
                            </Link>
                            <Button size="small" onClick={() => handleJoin(course.courseId)}>
                              Gabung
                            </Button>
                          </div>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              </Card>
            ) : (
              <Card style={{ textAlign: 'center', padding: '40px 0' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical">
                      <Text>Belum ada kursus praktikum yang terdaftar.</Text>
                      <Text type="secondary">Hubungi instruktur Anda untuk mendapatkan kode kelas.</Text>
                    </Space>
                  }
                />
              </Card>
            )}
          </>
        )}
      </Space>

      {/* Create Course Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1677ff' }} />
            <span>Buat Kursus Baru</span>
          </Space>
        }
        open={showCreateModal}
        width="min(520px, 95vw)"
        onCancel={() => {
          setShowCreateModal(false)
          createForm.resetFields()
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowCreateModal(false)}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<DatabaseOutlined />}
            loading={actionLoading}
            onClick={() => createForm.submit()}
          >
            Simpan Kursus
          </Button>
        ]}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateCourse}>
          <Form.Item
            label="Judul Kursus / Mata Kuliah"
            name="title"
            rules={[{ required: true, message: 'Masukkan judul kursus' }]}
          >
            <Input placeholder="Contoh: Manajemen Basis Data Praktikum" autoFocus prefix={<BookOutlined />} />
          </Form.Item>
          <Form.Item
            label="Deskripsi Kursus"
            name="description"
            rules={[{ required: true, message: 'Masukkan deskripsi kursus' }]}
          >
            <TextArea
              rows={4}
              placeholder="Deskripsikan tujuan pembelajaran, silabus, atau petunjuk kelas..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1677ff' }} />
            <span>Edit Informasi Kursus</span>
          </Space>
        }
        open={Boolean(editingCourse)}
        width="min(520px, 95vw)"
        onCancel={() => {
          setEditingCourse(null)
          editForm.resetFields()
        }}
        footer={[
          <Button key="cancel" onClick={() => setEditingCourse(null)}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={actionLoading}
            onClick={() => editForm.submit()}
          >
            Simpan Perubahan
          </Button>
        ]}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditCourse}>
          <Form.Item
            label="Judul Kursus / Mata Kuliah"
            name="title"
            rules={[{ required: true, message: 'Masukkan judul kursus' }]}
          >
            <Input prefix={<BookOutlined />} />
          </Form.Item>
          <Form.Item
            label="Deskripsi Kursus"
            name="description"
            rules={[{ required: true, message: 'Masukkan deskripsi kursus' }]}
          >
            <TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* Duplicate Course Modal */}
      <Modal
        title={
          <Space>
            <CopyOutlined style={{ color: '#52c41a' }} />
            <span>Duplikasi Kursus ke Kursus Saya</span>
          </Space>
        }
        open={Boolean(duplicatingCourse)}
        width="min(540px, 95vw)"
        onCancel={() => {
          setDuplicatingCourse(null)
          duplicateForm.resetFields()
        }}
        footer={[
          <Button key="cancel" onClick={() => setDuplicatingCourse(null)}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<CopyOutlined />}
            loading={actionLoading}
            onClick={() => duplicateForm.submit()}
          >
            Duplikasi Sekarang
          </Button>
        ]}
      >
        <Paragraph type="secondary">
          Sistem akan menduplikasi metadata kursus dan seluruh modul tugas praktikum di dalamnya ke dalam akun Anda dengan status <strong>Draft</strong>, sehingga Anda dapat menyesuaikannya secara mandiri.
        </Paragraph>
        <Form form={duplicateForm} layout="vertical" onFinish={handleDuplicateCourse}>
          <Form.Item
            label="Judul Kursus Baru (Salinan)"
            name="title"
            rules={[{ required: true, message: 'Masukkan judul kursus salinan' }]}
          >
            <Input prefix={<BookOutlined />} autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
