import { useCallback, useEffect, useState } from 'react'
import { 
  Button, Card, Row, Col, Typography, Divider, List, Tag, Space, Spin, 
  message, Alert, Modal, Form, Input, Avatar 
} from 'antd'
import { 
  ArrowLeftOutlined, BookOutlined, CheckCircleOutlined, UserOutlined, 
  CalendarOutlined, FileTextOutlined, CopyOutlined, LockOutlined, 
  AppstoreOutlined 
} from '@ant-design/icons'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getAssignmentService } from '@/lib/firebase/assignmentInstance'
import { getAdapters } from '@/lib/firebase/config'
import { useAuthStore } from '@/stores/authStore'
import type { Assignment, Course } from '@/features/assignments/domain/assignmentModel'
import { formatDueDate } from '@/features/assignments/domain/assignmentModel'

const { Paragraph, Text, Title } = Typography

export function CourseDetailPage(): JSX.Element {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isLecturer = user?.role === 'lecturer' || user?.role === 'super_admin' || user?.role === 'admin'

  const [course, setCourse] = useState<Course | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<{ displayName?: string; email?: string } | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [duplicateForm] = Form.useForm()

  const loadData = useCallback(async () => {
    if (!courseId) return
    try {
      setLoading(true)
      const service = getAssignmentService()
      const courseData = await service.getCourse(courseId)
      setCourse(courseData)

      if (courseData) {
        // Fetch creator profile
        const adapters = getAdapters()
        if (adapters && courseData.lecturerUid) {
          try {
            const p = await adapters.users.loadProfile(courseData.lecturerUid)
            if (p) setCreatorProfile({ displayName: p.displayName, email: p.email })
          } catch {
            // ignore
          }
        }

        // Fetch assignments for this course
        if (isLecturer) {
          const list = await service.listAssignmentsForCourse(courseId)
          setAssignments(list)
        } else {
          const published = await service.listPublished()
          setAssignments(published.filter((a) => a.courseId === courseId))
        }
      }
    } catch (error) {
      console.error(error)
      message.error('Gagal memuat detail kursus')
    } finally {
      setLoading(false)
    }
  }, [courseId, isLecturer])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const isOwner = user && (course?.lecturerUid === user.uid || user.role === 'super_admin' || user.role === 'admin')

  const lecturerDisplayName =
    user && course?.lecturerUid === user.uid
      ? user.displayName || user.email || 'Anda'
      : creatorProfile?.displayName || creatorProfile?.email || `Instruktur (${course?.lecturerUid?.slice(0, 6)}...)`

  async function handleDuplicate(values: { title: string }): Promise<void> {
    if (!courseId) return
    try {
      setDuplicateLoading(true)
      const duplicated = await getAssignmentService().duplicateCourse(courseId, values.title.trim())
      message.success(`Kursus "${duplicated.title}" berhasil diduplikasi ke Kursus Saya!`)
      setShowDuplicateModal(false)
      duplicateForm.resetFields()
      navigate(`/courses/${duplicated.courseId}`)
    } catch (err) {
      console.error(err)
      message.error(err instanceof Error ? err.message : 'Gagal menduplikasi kursus')
    } finally {
      setDuplicateLoading(false)
    }
  }

  if (!courseId) return <Title level={3}>Kursus tidak ditemukan</Title>

  if (loading) {
    return (
      <div className="page-centered" style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Memuat detail kursus...</Text>
        </div>
      </div>
    )
  }

  return (
    <div className="page-narrow" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }} onClick={() => navigate('/courses')}>
        Kembali ke Daftar Kursus
      </Button>

      {/* Read-Only Notice for other lecturers */}
      {isLecturer && !isOwner && (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 20 }}
          message="Katalog Kursus Instruktur Lain (Mode Lihat Saja)"
          description={
            <div style={{ marginTop: 4 }}>
              <span>
                Kursus ini dibuat oleh <strong>{lecturerDisplayName}</strong>. Anda dapat melihat modul tugas di bawah ini untuk referensi materi praktikum. Jika ingin mengajar kelas ini, silakan <strong>duplikasi kursus</strong> ke koleksi Kursus Saya.
              </span>
              <div style={{ marginTop: 12 }}>
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    duplicateForm.setFieldsValue({ title: `${course?.title || 'Kursus'} (Salinan)` })
                    setShowDuplicateModal(true)
                  }}
                >
                  Duplikasi Kursus Ini ke Kursus Saya
                </Button>
              </div>
            </div>
          }
        />
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space align="center">
                <BookOutlined style={{ color: '#1677ff' }} />
                <span>{course?.title ?? courseId}</span>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            extra={
              <Space wrap>
                {isOwner ? (
                  <Tag color="green">
                    <CheckCircleOutlined /> Kursus Anda
                  </Tag>
                ) : (
                  <Tag color="orange" icon={<LockOutlined />}>
                    Read-Only
                  </Tag>
                )}
                <Tag color="blue">{assignments.length} Modul Tugas</Tag>
              </Space>
            }
          >
            <Paragraph style={{ fontSize: 15, lineHeight: 1.6 }}>
              {course?.description || 'Belum ada deskripsi untuk kursus ini.'}
            </Paragraph>

            <Divider style={{ margin: '16px 0' }} />

            <Space wrap split={<Divider type="vertical" />}>
              <Text type="secondary">
                <CalendarOutlined /> Dibuat:{' '}
                {course?.createdAt
                  ? new Date(course.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                  : '-'}
              </Text>
              <Space align="center" size={6}>
                <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1677ff' }} />
                <Text type="secondary">
                  Dosen Pengampu: <strong>{lecturerDisplayName}</strong>
                  {creatorProfile?.email ? ` (${creatorProfile.email})` : ''}
                </Text>
              </Space>
            </Space>
          </Card>

          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Daftar Modul Tugas & Praktikum Lab ({assignments.length})</span>
              </Space>
            }
            style={{ marginTop: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            extra={
              isOwner && (
                <Button type="link" onClick={() => navigate('/assignments')}>
                  Kelola di Halaman Tugas →
                </Button>
              )
            }
          >
            <List
              locale={{ emptyText: 'Belum ada tugas pada kursus ini.' }}
              dataSource={assignments}
              renderItem={(item) => (
                <List.Item
                  key={item.assignmentId}
                  actions={[
                    <Link to="/assignments" key="view">
                      <Button type="primary" size="small" icon={<FileTextOutlined />}>
                        Buka Tugas
                      </Button>
                    </Link>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{item.title}</Text>
                        <Tag color={item.status === 'published' ? 'green' : 'orange'}>{item.status}</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div>{item.description}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Tenggat Waktu: {formatDueDate(item.dueAt)}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <AppstoreOutlined />
                <span>Informasi Kelas</span>
              </Space>
            }
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">Kode / ID Kursus</Text>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{courseId}</div>
              </div>

              <div>
                <Text type="secondary">Status Kepemilikan</Text>
                <div>
                  {isOwner ? (
                    <Tag color="green">Pemilik Kursus (Dapat Mengedit & Menilai)</Tag>
                  ) : (
                    <Tag color="orange">Katalog Instruktur Lain (Lihat Saja)</Tag>
                  )}
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {isLecturer && !isOwner && (
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  block
                  onClick={() => {
                    duplicateForm.setFieldsValue({ title: `${course?.title || 'Kursus'} (Salinan)` })
                    setShowDuplicateModal(true)
                  }}
                >
                  Duplikasi ke Kursus Saya
                </Button>
              )}

              {isOwner && (
                <Button type="primary" block onClick={() => navigate('/assignments')}>
                  Buka Halaman Tugas & Penilaian →
                </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Duplicate Course Modal */}
      <Modal
        title={
          <Space>
            <CopyOutlined style={{ color: '#52c41a' }} />
            <span>Duplikasi Kursus ke Kursus Saya</span>
          </Space>
        }
        open={showDuplicateModal}
        width="min(520px, 95vw)"
        onCancel={() => {
          setShowDuplicateModal(false)
          duplicateForm.resetFields()
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowDuplicateModal(false)}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<CopyOutlined />}
            loading={duplicateLoading}
            onClick={() => duplicateForm.submit()}
          >
            Duplikasi Sekarang
          </Button>
        ]}
      >
        <Paragraph type="secondary">
          Sistem akan membuat salinan kursus & seluruh modul tugas di dalamnya ke dalam akun Anda dengan status <strong>Draft</strong>.
        </Paragraph>
        <Form form={duplicateForm} layout="vertical" onFinish={handleDuplicate}>
          <Form.Item
            label="Judul Kursus Baru"
            name="title"
            rules={[{ required: true, message: 'Masukkan judul kursus baru' }]}
          >
            <Input prefix={<BookOutlined />} autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
