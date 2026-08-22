import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  DatePicker,
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
import { App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { getAssignmentService } from '@/lib/firebase/assignmentInstance'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import type { ProjectSummary } from '@/lib/persistence/localProjectRepository'
import {
  formatDueDate,
  type Assignment,
  type AssignmentStatus,
  type Course
} from './domain/assignmentModel'
import { SubmissionReviewDrawer } from '@/features/submissions/SubmissionReviewDrawer'

/**
 * Lecturer assignment management (Phase 6): create, edit, publish /
 * unpublish, archive. Destructive delete is limited to drafts — once an
 * assignment is published (and later once submissions exist), archive
 * instead so student history is preserved.
 */

interface EditorValues {
  title: string
  courseId: string
  dueAt: Dayjs | null
  description: string
  instructions: string
  learningObjectives: string
  requirements: string
  starterProjectId: string | null
  starterSql: string
  sampleData: string
}

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'orange'
}

export function LecturerAssignments() {
  const { message } = App.useApp()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [localProjects, setLocalProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [reviewTarget, setReviewTarget] = useState<Assignment | null>(null)
  const [form] = Form.useForm<EditorValues>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mine, courseList, projects] = await Promise.all([
        getAssignmentService().listForLecturer(),
        getAssignmentService().listCourses(),
        projectRepository.listProjects()
      ])
      setAssignments(mine.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      setCourses(courseList)
      setLocalProjects(projects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load assignments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = useCallback(() => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ courseId: courses[0]?.courseId })
    setEditorOpen(true)
  }, [courses, form])

  const openEdit = useCallback(
    (assignment: Assignment) => {
      setEditing(assignment)
      form.setFieldsValue({
        title: assignment.title,
        courseId: assignment.courseId,
        dueAt: assignment.dueAt ? dayjs(assignment.dueAt) : null,
        description: assignment.description,
        instructions: assignment.instructions,
        learningObjectives: assignment.learningObjectives.join('\n'),
        requirements: assignment.requirements.join('\n'),
        starterProjectId: null,
        starterSql: assignment.starterSql,
        sampleData: assignment.sampleData
      })
      setEditorOpen(true)
    },
    [form]
  )

  const splitLines = (value: string | undefined): string[] =>
    (value ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

  const handleSave = useCallback(async () => {
    const values = await form.validateFields()
    const starterProject = values.starterProjectId
      ? await projectRepository.loadProject(values.starterProjectId)
      : null

    try {
      if (editing) {
        await getAssignmentService().update({
          ...editing,
          title: values.title,
          courseId: values.courseId,
          dueAt: values.dueAt ? values.dueAt.toISOString() : null,
          description: values.description ?? '',
          instructions: values.instructions ?? '',
          learningObjectives: splitLines(values.learningObjectives),
          requirements: splitLines(values.requirements),
          starterErd: starterProject ?? editing.starterErd,
          starterSql: values.starterSql ?? '',
          sampleData: values.sampleData ?? ''
        })
        void message.success('Assignment updated.')
      } else {
        await getAssignmentService().create({
          title: values.title,
          courseId: values.courseId,
          dueAt: values.dueAt ? values.dueAt.toISOString() : null,
          description: values.description ?? '',
          instructions: values.instructions ?? '',
          learningObjectives: splitLines(values.learningObjectives),
          requirements: splitLines(values.requirements),
          status: 'draft',
          starterErd: starterProject,
          starterSql: values.starterSql ?? '',
          sampleData: values.sampleData ?? ''
        })
        void message.success('Draft assignment created. Publish it when ready.')
      }
      setEditorOpen(false)
      await load()
    } catch (err) {
      void message.error(err instanceof Error ? err.message : 'Save failed.')
    }
  }, [editing, form, load, message])

  const handleStatus = useCallback(
    async (assignment: Assignment, status: AssignmentStatus) => {
      try {
        await getAssignmentService().setStatus(assignment.assignmentId, status)
        await load()
      } catch (err) {
        void message.error(err instanceof Error ? err.message : 'Status change failed.')
      }
    },
    [load, message]
  )

  const handleDelete = useCallback(
    async (assignment: Assignment) => {
      try {
        await getAssignmentService().deleteDraft(assignment.assignmentId)
        void message.success('Draft deleted.')
        await load()
      } catch (err) {
        void message.error(err instanceof Error ? err.message : 'Delete failed.')
      }
    },
    [load, message]
  )

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Assignment management
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New assignment
        </Button>
      </Space>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      <Table
        rowKey="assignmentId"
        loading={loading}
        dataSource={assignments}
        pagination={false}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (status: AssignmentStatus) => (
              <Tag color={STATUS_COLORS[status]}>{status}</Tag>
            )
          },
          {
            title: 'Due',
            dataIndex: 'dueAt',
            render: (dueAt: string | null) => formatDueDate(dueAt)
          },
          {
            title: 'Actions',
            render: (_, assignment) => (
              <Space wrap size={4}>
                <Button size="small" onClick={() => openEdit(assignment)}>
                  Edit
                </Button>
                {assignment.status === 'draft' && (
                  <Button size="small" type="primary" onClick={() => void handleStatus(assignment, 'published')}>
                    Publish
                  </Button>
                )}
                {assignment.status === 'published' && (
                  <>
                    <Button size="small" onClick={() => void handleStatus(assignment, 'draft')}>
                      Unpublish
                    </Button>
                    <Button size="small" onClick={() => void handleStatus(assignment, 'archived')}>
                      Archive
                    </Button>
                  </>
                )}
                {assignment.status !== 'draft' && (
                  <Button size="small" onClick={() => setReviewTarget(assignment)}>
                    Review
                  </Button>
                )}
                {assignment.status === 'draft' && (
                  <Popconfirm
                    title="Delete this draft?"
                    description="Published assignments cannot be deleted — archive them instead."
                    onConfirm={() => void handleDelete(assignment)}
                  >
                    <Button size="small" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editing ? `Edit: ${editing.title}` : 'New assignment'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void handleSave()}
        width={720}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Enter a title' }]}
          >
            <Input placeholder="e.g. Marketplace Database" />
          </Form.Item>
          <Form.Item
            label="Course"
            name="courseId"
            rules={[{ required: true, message: 'Choose a course' }]}
          >
            <Select
              options={courses.map((course) => ({ value: course.courseId, label: course.title }))}
              placeholder="Select course"
              notFoundContent="No courses found — create one in the Firestore console (Phase 6 keeps course creation admin-side)."
            />
          </Form.Item>
          <Form.Item label="Due date" name="dueAt">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Instructions" name="instructions">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            label="Learning objectives (one per line)"
            name="learningObjectives"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Requirements (one per line)" name="requirements">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            label="Starter ERD (clone one of your local projects as the template)"
            name="starterProjectId"
          >
            <Select
              allowClear
              placeholder="Optional — students receive a clone, never the original"
              options={localProjects.map((project) => ({
                value: project.id,
                label: project.name
              }))}
            />
          </Form.Item>
          <Form.Item label="Starter SQL (optional)" name="starterSql">
            <Input.TextArea rows={3} placeholder="CREATE TABLE … or INSERT …" />
          </Form.Item>
          <Form.Item label="Sample data SQL (optional)" name="sampleData">
            <Input.TextArea rows={3} placeholder="INSERT INTO …" />
          </Form.Item>
        </Form>
      </Modal>

      <SubmissionReviewDrawer
        assignment={reviewTarget}
        open={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
      />
    </div>
  )
}
