/**
 * Course detail page (Phase 6+).
 * Shows course info, enrolled students, available assignments.
 * Lecturers can manage members; students see their progress.
 */
import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row, Space, Table, Tag, Typography, Avatar, Input, Modal, message, Tabs } from 'antd'
import { 
  BookOutlined, 
  UserGroupOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  RocketOutlined,
  PlusOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { useCourseService } from '@/lib/firebase/courseAdapter'
import type { CourseWithMembers, CourseMember } from '@/lib/firebase/courseAdapter'

export function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const courseService = useCourseService()
  
  const [course, setCourse] = useState<CourseWithMembers | null>(null)
  const [members, setMembers] = useState<CourseMember[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollmentOpen, setEnrollmentOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const myRole = useAuthStore((s) => s.user?.role ?? 'student')

  useEffect(() => {
    loadCourse()
    if (myRole === 'lecturer') {
      loadMembers()
    }
  }, [courseId])

  async function loadCourse() {
    try {
      const c = await courseService.getCourse(courseId!)
      setCourse(c)
      setLoading(false)
    } catch (error) {
      console.error(error)
      message.error('Failed to load course')
    }
  }

  async function loadMembers() {
    const m = await courseService.getMembers(courseId!, undefined)
    setMembers(m)
  }

  async function handleJoin() {
    try {
      setJoining(true)
      await courseService.joinCourse(courseId!, user!.uid)
      message.success('Joined course! Go check your assignments.')
      setEnrollmentOpen(false)
      loadCourse()
    } catch (error) {
      console.error(error)
      message.error('Failed to join course')
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    Modal.confirm({
      title: 'Leave course?',
      content: 'You will lose access to this course and its assignments.',
      onOk: async () => {
        try {
          await courseService.leaveCourse(courseId!, user!.uid)
          message.success('Left course successfully')
          navigate('/courses')
        } catch (error) {
          console.error(error)
          message.error('Failed to leave course')
        }
      }
    })
  }

  if (!course || loading) return <div>Loading...</div>

  const isStudent = myRole === 'student'
  const isInCourse = members.some(m => m.uid === user?.uid)

  return (
    <div className="page-narrow">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Course Header */}
        <Card
          extra={
            <Space>
              {isStudent && !isInCourse ? (
                <Button type="primary" onClick={() => setEnrollmentOpen(true)}>
                  Join Course
                </Button>
              ) : (
                <>
                  <Tag icon={<BookOutlined />} color="blue">
                    {course.memberCount || 0} enrolled
                  </Tag>
                  {isInCourse && (
                    <Button danger onClick={handleLeave}>
                      Leave Course
                    </Button>
                  )}
                </>
              )}
            </Space>
          }
        >
          <Typography.Title level={2} style={{ marginBottom: 8 }}>
            {course.title}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            {course.description || 'No description provided.'}
          </Typography.Paragraph>
        </Card>

        {/* Assignments Tab */}
        <Tabs defaultActiveKey="assignments">
          <Tabs.TabPane
            tab={<><RocketOutlined /> Available Assignments</>}
            key="assignments"
          >
            <AssignmentList courseId={courseId!} />
          </Tabs.TabPane>

          {/* Members Tab (lecturer only) */}
          {myRole === 'lecturer' && (
            <Tabs.TabPane
              tab={<><UserGroupOutlined /> Enrolled Students</>}
              key="members"
            >
              <MemberList members={members} />
            </Tabs.TabPane>
          )}
        </Tabs>
      </Space>
    </div>
  )
}

// Helper component for member list
function MemberList({ members }: { members: CourseMember[] }) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', key: 'role', render: (role: string) => <Tag>{role}</Tag> },
    { title: 'Joined', key: 'joinedAt', render: (v: string) => new Date(v).toLocaleDateString() }
  ]

  return <Table dataSource={members} columns={columns} rowKey="membershipId" pagination={false} />
}

// Helper component for assignment list
function AssignmentList({ courseId }: { courseId: string }) {
  // Will be implemented in next iteration
  return <Typography.Text type="secondary">Loading assignments...</Typography.Text>
}
