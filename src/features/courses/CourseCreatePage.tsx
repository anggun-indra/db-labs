import { useState } from 'react'
import { Button, Card, Col, Form, Input, Modal, Row, Typography, message, Tag } from 'antd'
import { PlusOutlined, BookOutlined, RocketOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { useCourseService, type CourseAdapter } from '@/lib/firebase/courseAdapter'

/**
 * Lecturer course creation wizard (Phase 6+).
 * Creates courses with starter assignments that include task checklists.
 */
export function CourseCreatePage() {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const formRef = useRef<FormInstance>()
  const [courseService] = useState(() => createCourseService())

  async function handleSubmit() {
    try {
      await formRef.current.validateFields()
      const values = formRef.current.getFieldsValue()
      
      const courseId = await courseService.createCourse({
        title: values.title,
        description: values.description || '',
        lecturerUid: user?.uid ?? ''
      })
      
      message.success('Course created! Create your first assignment next.')
      setOpen(false)
      formRef.current.resetFields()
      router.push(`/courses/${courseId}/assignments`)
    } catch (error) {
      message.error('Failed to create course')
      console.error(error)
    }
  }

  return (
    <>
      <Button
        icon={<PlusOutlined />}
        size="large"
        onClick={() => setOpen(true)}
      >
        Create New Course
      </Button>

      <Modal
        open={open}
        title="Create New Course"
        onCancel={() => setOpen(false)}
        footer={null}
        width={700}
      >
        <Form
          ref={formRef}
          layout="vertical"
          onFinish={handleSubmit}
          autoValidateRules
        >
          <Form.Item
            name="title"
            label="Course Title"
            rules={[{ required: true, min: 1 }]}
          >
            <Input placeholder="e.g., Introduction to Database Design" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Course Description"
          >
            <Input.TextArea
              rows={4}
              placeholder="Brief overview of what students will learn..."
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              Create Course
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}
