import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography
} from 'antd'
import { App } from 'antd'
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  RocketOutlined
} from '@ant-design/icons'
import { getAssignmentService } from '@/lib/firebase/assignmentInstance'
import { getSubmissionService } from '@/lib/firebase/submissionInstance'
import type { Submission } from '@/features/submissions/domain/submissionModel'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import {
  formatDueDate,
  isOverdue,
  type Assignment,
  type Course
} from './domain/assignmentModel'
import { deriveProgress, getLink, linkProject } from './domain/assignmentLinks'
import { cloneStarterErd } from './domain/starterClone'
import { createProject } from '@/features/erd/domain/factory'
import { generateSqliteSchema } from '@/lib/sqlite/ddlGenerator'
import { useProjectDbStore } from '@/stores/projectDbStore'
import { sqliteService } from '@/lib/sqlite/sqlJsRuntime'

/**
 * Student assignment list (Phase 6): published assignments only, with due
 * date, progress and Start Assignment. Starting clones the starter ERD
 * into a NEW local project — the master template is never edited.
 */
export function StudentAssignments() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [projectIds, setProjectIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Assignment | null>(null)
  const [starting, setStarting] = useState(false)
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [published, courseList, projects, submissions] = await Promise.all([
        getAssignmentService().listPublished(),
        getAssignmentService().listCourses(),
        projectRepository.listProjects(),
        getSubmissionService().listMine()
      ])
      setAssignments(published.sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')))
      setCourses(courseList)
      setProjectIds(new Set(projects.map((p) => p.id)))
      setMySubmissions(submissions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load assignments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const courseTitle = useMemo(() => {
    const map = new Map(courses.map((course) => [course.courseId, course.title]))
    return (courseId: string) => map.get(courseId) ?? courseId
  }, [courses])

  const handleStart = useCallback(
    async (assignment: Assignment) => {
      setStarting(true)
      try {
        const existing = getLink(assignment.assignmentId)
        if (existing && projectIds.has(existing.projectId)) {
          navigate(`/projects/${existing.projectId}/erd`)
          return
        }
        const project = assignment.starterErd
          ? cloneStarterErd(assignment.starterErd, assignment.title)
          : createProject(assignment.title)
        await projectRepository.saveProject(project)
        linkProject(assignment.assignmentId, project.projectId)
        setProjectIds((prev) => new Set(prev).add(project.projectId))
        void message.success(
          assignment.starterErd
            ? 'Starter ERD cloned into your own project. The assignment template stays untouched.'
            : 'Project created. Design your ERD according to the instructions.'
        )
        navigate(`/projects/${project.projectId}/erd`)
      } catch (err) {
        void message.error(err instanceof Error ? err.message : 'Could not start the assignment.')
      } finally {
        setStarting(false)
      }
    },
    [navigate, message, projectIds]
  )

  const handleInitializeDb = useCallback(
    async (assignment: Assignment) => {
      const link = getLink(assignment.assignmentId)
      if (!link) return
      try {
        const project = await projectRepository.loadProject(link.projectId)
        if (!project) {
          void message.error('The linked project no longer exists.')
          return
        }
        const generated = generateSqliteSchema(project)
        await useProjectDbStore.getState().createFromDdl(link.projectId, generated.sql)
        const script = getAssignmentService().buildInitScript(assignment)
        if (script.trim().length > 0) {
          const result = await sqliteService.execute(script)
          if (result.kind === 'error') {
            void message.warning(`Database created, but the starter SQL reported: ${result.error?.raw ?? 'unknown error'}`)
            return
          }
        }
        await useProjectDbStore.getState().refreshSchema(project)
        void message.success('Local database initialized from the assignment starter content.')
        navigate(`/projects/${link.projectId}/sql`)
      } catch (err) {
        void message.error(err instanceof Error ? err.message : 'Initialization failed.')
      }
    },
    [message, navigate]
  )

  const handleSubmit = useCallback(
    async (assignment: Assignment) => {
      const link = getLink(assignment.assignmentId)
      if (!link) return
      setSubmitting(true)
      try {
        const project = await projectRepository.loadProject(link.projectId)
        if (!project) {
          void message.error('The linked project no longer exists.')
          return
        }
        const submission = await getSubmissionService().submit({
          assignmentId: assignment.assignmentId,
          courseId: assignment.courseId,
          projectId: link.projectId,
          erd: project,
          fileName: `${assignment.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-v.sqlite`
        })
        void message.success(
          `Submitted version ${submission.version}. Your project stays editable; resubmit any time.`
        )
        setMySubmissions((prev) => [...prev, submission])
      } catch (err) {
        void message.error(
          err instanceof Error ? err.message : 'Submission failed — nothing was marked as submitted.'
        )
      } finally {
        setSubmitting(false)
      }
    },
    [message]
  )

  const submissionsFor = useCallback(
    (assignmentId: string) =>
      mySubmissions
        .filter((submission) => submission.assignmentId === assignmentId)
        .sort((a, b) => b.version - a.version),
    [mySubmissions]
  )

  if (loading) {
    return (
      <div className="page-centered">
        <Spin tip="Loading assignments…" />
      </div>
    )
  }

  return (
    <div>
      <Typography.Title level={3}>Assignments</Typography.Title>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {assignments.length === 0 && !error ? (
        <Empty description="No published assignments yet. Check back later." />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, md: 2, xl: 3 }}
          dataSource={assignments}
          renderItem={(assignment) => {
            const submitted = submissionsFor(assignment.assignmentId).length > 0
            const baseProgress = deriveProgress(assignment.assignmentId, projectIds)
            const progress = submitted && baseProgress !== 'not-started' ? 'submitted' : baseProgress
            const link = getLink(assignment.assignmentId)
            const overdue = isOverdue(assignment.dueAt) && progress !== 'submitted'
            return (
              <List.Item>
                <Card
                  title={assignment.title}
                  size="small"
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                  extra={
                    <Tag color={overdue ? 'red' : 'blue'}>
                      {formatDueDate(assignment.dueAt)}
                    </Tag>
                  }
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Typography.Text type="secondary">
                      {courseTitle(assignment.courseId)}
                    </Typography.Text>
                    <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                      {assignment.description || 'No description.'}
                    </Typography.Paragraph>
                    <Tag
                      color={
                        progress === 'submitted'
                          ? 'gold'
                          : progress === 'in-progress'
                            ? 'green'
                            : 'default'
                      }
                      icon={
                        progress === 'submitted' || progress === 'in-progress' ? (
                          <CheckCircleOutlined />
                        ) : undefined
                      }
                    >
                      {progress === 'submitted'
                        ? `Submitted (${submissionsFor(assignment.assignmentId).length})`
                        : progress === 'in-progress'
                          ? 'In progress'
                          : 'Not started'}
                    </Tag>
                  </Space>
                  <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      onClick={() => setDetail(assignment)}
                    >
                      Details
                    </Button>
                    {progress === 'not-started' ? (
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={starting}
                        onClick={() => void handleStart(assignment)}
                        data-testid="start-assignment"
                      >
                        Start
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        icon={<RocketOutlined />}
                        onClick={() => link && navigate(`/projects/${link.projectId}/erd`)}
                      >
                        Open project
                      </Button>
                    )}
                  </div>
                </Card>
              </List.Item>
            )
          }}
        />
      )}

      <Drawer
        title={detail?.title}
        open={detail !== null}
        onClose={() => setDetail(null)}
        width="min(520px, 100vw)"
        style={{ maxWidth: '100vw' }}
      >
        {detail && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions
              column={1}
              size="small"
              items={[
                { key: 'course', label: 'Course', children: courseTitle(detail.courseId) },
                { key: 'due', label: 'Due', children: formatDueDate(detail.dueAt) },
                {
                  key: 'starter',
                  label: 'Starter content',
                  children: [
                    detail.starterErd ? 'starter ERD' : null,
                    detail.starterSql.trim() ? 'starter SQL' : null,
                    detail.sampleData.trim() ? 'sample data' : null
                  ]
                    .filter(Boolean)
                    .join(', ') || 'none'
                }
              ]}
            />
            {detail.description && (
              <div>
                <Typography.Text strong>Description</Typography.Text>
                <Typography.Paragraph>{detail.description}</Typography.Paragraph>
              </div>
            )}
            {detail.instructions && (
              <div>
                <Typography.Text strong>Instructions</Typography.Text>
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {detail.instructions}
                </Typography.Paragraph>
              </div>
            )}
            {detail.learningObjectives.length > 0 && (
              <div>
                <Typography.Text strong>Learning objectives</Typography.Text>
                <ul>
                  {detail.learningObjectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </div>
            )}
            {detail.requirements.length > 0 && (
              <div>
                <Typography.Text strong>Requirements</Typography.Text>
                <ul>
                  {detail.requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}
            {getLink(detail.assignmentId) &&
              (detail.starterSql.trim() || detail.sampleData.trim()) && (
                <Button onClick={() => void handleInitializeDb(detail)}>
                  Initialize local DB from starter SQL
                </Button>
              )}
            {getLink(detail.assignmentId) && (
              <div>
                <Typography.Text strong>Submission</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    loading={submitting}
                    onClick={() => void handleSubmit(detail)}
                    data-testid="submit-work"
                  >
                    {submissionsFor(detail.assignmentId).length > 0
                      ? 'Resubmit (new version)'
                      : 'Submit work'}
                  </Button>
                </div>
                {submissionsFor(detail.assignmentId).length > 0 && (
                  <List
                    size="small"
                    style={{ marginTop: 8 }}
                    dataSource={submissionsFor(detail.assignmentId)}
                    renderItem={(submission) => (
                      <List.Item>
                        <Space>
                          <Tag>v{submission.version}</Tag>
                          <Typography.Text type="secondary">
                            {new Date(submission.submittedAt).toLocaleString()}
                          </Typography.Text>
                          {submission.status === 'graded' ? (
                            <Tag color="green">
                              score {submission.score}
                            </Tag>
                          ) : (
                            <Tag color="blue">awaiting review</Tag>
                          )}
                        </Space>
                        {submission.feedback && (
                          <Typography.Paragraph
                            style={{ marginBottom: 0, marginTop: 4 }}
                            ellipsis={{ rows: 2, expandable: true }}
                          >
                            {submission.feedback}
                          </Typography.Paragraph>
                        )}
                      </List.Item>
                    )}
                  />
                )}
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  )
}
