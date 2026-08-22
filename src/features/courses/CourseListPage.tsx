/**
 * Course list page for students (Phase 6+).
 * Shows all available courses and user's enrollments.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Empty, Row, Typography, Tag, Skeleton } from 'antd'
import { 
  BookOutlined, UsersOutlined, RocketOutlined, ArrowRightOutlined 
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { useCourseService } from '@/lib/firebase/courseAdapter'
import type { CourseWithMembers } from '@/lib/firebase/courseAdapter'

export function CourseListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const courseService = useCourseService()
  
  const [courses, setCourses] = useState<CourseWithMembers[]>([])
  const [myCourses, setMyCourses] = useState<CourseWithMembers[]>([])
  const [allCourses, setAllCourses] = useState<CourseWithMembers[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  async function loadCourses() {
    if (!user) return
    
    try {
      // Load my enrolled courses
      const my = await courseService.getCoursesForStudent(user.uid)
      setMyCourses(my)
      
      // For now, also fetch public available courses
      // In production, this would come from Firestore
      setAllCourses(my)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-narrow">
      <Typography.Title level={3}>Courses</Typography.Title>
      
      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map(i => (
            <Col xs={24} md={8} key={i}>
              <Skeleton.Active />
            </Col>
          ))}
        </Row>
      ) : (
        <>
          {/* My Courses */}
          <Typography.Paragraph style={{ marginBottom: 16 }}>
            <strong>Your Courses</strong> ({myCourses.length})
          </Typography.Paragraph>
          
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            {myCourses.map(course => (
              <Col xs={24} md={8} key={course.courseId}>
                <CourseCard course={course} />
              </Col>
            ))}
            {myCourses.length === 0 && (
              <Col xs={24}>
                <Empty 
                  image="simple"
                  description="No courses yet. Ask your instructor for an enrollment code!"
                />
              </Col>
            )}
          </Row>

          {/* Available Courses (if lecturer shows public ones) */}
          <Typography.Paragraph style={{ marginBottom: 16 }}>
            <strong>Available Courses</strong> ({allCourses.filter(c => !myCourses.includes(c)).length})
          </Typography.Paragraph>
          
          {/* Would show public courses here */}
        </>
      )}
    </div>
  )
}

function CourseCard({ course }: { course: CourseWithMembers }) {
  return (
    <Link to={`/courses/${course.courseId}`}>
      <Card hoverable cover={<img alt={course.title} src="/course-preview.svg" />} >
        <Card.Meta
          title={course.title}
          description={`${course.memberCount || 0} enrolled • ${course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : ''}`}
        />
        <div style={{ marginTop: 16 }}>
          <Button block size="large" icon={<ArrowRightOutlined />}>
            Go to Course
          </Button>
        </div>
      </Card>
    </Link>
  )
}
