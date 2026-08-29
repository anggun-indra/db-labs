/**
 * Course creation page (Phase 6+).
 * Lecturers can create new courses with title, description, and details.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, message, Space, Divider } from 'antd'
import { BookOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import type { Course } from '@/features/assignments/domain/courseModels'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export function CourseCreatePage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  async function handleCreate(values: { title: string; description: string }): Promise<void> {
    if (!user) {
      message.error('Please sign in to create a course')
      return
    }

    try {
      setLoading(true)

      // Generate unique course ID (in production, use Firestore generateId)
      const courseId = `course-${Date.now()}`

      const newCourse: Course = {
        courseId,
        title: values.title,
        description: values.description,
        lecturerUid: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // TODO: Save to Firestore using courseService.createCourse(newCourse)
      
      console.log('Created course:', newCourse)
      
      message.success(`Course "${values.title}" created successfully!`)
      
      // Navigate to courses list
      setTimeout(() => {
        navigate('/courses')
      }, 1500)

    } catch (error) {
      console.error(error)
      message.error('Failed to create course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-narrow">
      <Card>
        <Space 
          direction="vertical" 
          style={{ width: '100%' }}
          align="center"
        >
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/courses')}
            size="large"
          >
            Back to Courses
          </Button>

          <Title level={2}>Create New Course</Title>

          <Text type="secondary" style={{ fontSize: 16 }}>
            Create a new course that students can join
          </Text>
        </Space>

        <Divider />

        <Form
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            title: '',
            description: ''
          }}
        >
          <Form.Item
            label="Course Title*"
            name="title"
            rules={[{ required: true, message: 'Please enter course title!' }]}
          >
            <Input 
              placeholder="e.g., Database Fundamentals, SQL Mastery, Data Modeling"
              size="large"
              autoFocus
              prefix={<BookOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="Course Description*"
            name="description"
            rules={[{ required: true, message: 'Please enter course description!' }]}
          >
            <TextArea
              rows={5}
              placeholder="Describe your course topics, learning objectives, and what students will learn..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Paragraph type="secondary" style={{ marginTop: -8 }}>
            <BookOutlined /> Tip: Add clear learning objectives so students know what they'll achieve
          </Paragraph>

          <Form.Item style={{ marginTop: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              icon={<SaveOutlined />}
              block
            >
              Create Course
            </Button>
            
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 13 }}>
              Students will be able to enroll after you publish assignments
            </Text>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
