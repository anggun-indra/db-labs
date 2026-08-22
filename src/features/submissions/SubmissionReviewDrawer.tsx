import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from 'antd'
import { App } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import { getSubmissionService } from '@/lib/firebase/submissionInstance'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import { useProjectDbStore } from '@/stores/projectDbStore'
import { validateErd } from '@/features/erd/domain/validate'
import { cloneStarterErd } from '@/features/assignments/domain/starterClone'
import type { Assignment } from '@/features/assignments/domain/assignmentModel'
import type { Submission } from './domain/submissionModel'

/**
 * Lecturer review (Phase 7): inspect exactly what a student submitted —
 * frozen ERD, validation issues, and the submitted SQLite bytes imported
 * into a throwaway local project so the lecturer can browse tables and run
 * SQL fully in-browser. Grading writes only the grading fields.
 */
export function SubmissionReviewDrawer({
  assignment,
  open,
  onClose
}: {
  assignment: Assignment | null
  open: boolean
  onClose: () => void
}) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Submission | null>(null)
  const [loadingDb, setLoadingDb] = useState(false)
  const [grading, setGrading] = useState(false)
  const [form] = Form.useForm<{ score: number; feedback: string }>()

  const load = useCallback(async () => {
    if (!assignment) return
    setLoading(true)
    setError(null)
    try {
      const list = await getSubmissionService().listForAssignment(assignment.assignmentId)
      list.sort((a, b) => a.studentUid.localeCompare(b.studentUid) || b.version - a.version)
      setSubmissions(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submissions.')
    } finally {
      setLoading(false)
    }
  }, [assignment])

  useEffect(() => {
    if (open && assignment) {
      setSelected(null)
      void load()
    }
  }, [open, assignment, load])

  const validationIssues = useMemo(
    () => (selected ? validateErd(selected.erdSnapshot) : []),
    [selected]
  )
  const blockingCount = validationIssues.filter((issue) => issue.severity === 'error').length

  const handleLoadDb = useCallback(async () => {
    if (!selected) return
    setLoadingDb(true)
    try {
      const bytes = await getSubmissionService().restoreForReview(selected)
      const reviewProject = cloneStarterErd(
        selected.erdSnapshot,
        `Review: ${selected.erdSnapshot.name} (v${selected.version})`
      )
      await projectRepository.saveProject(reviewProject)
      await useProjectDbStore.getState().importBytes(reviewProject.projectId, bytes)
      await useProjectDbStore.getState().refreshSchema(reviewProject)
      void message.success(
        'Submitted database loaded into a local review project. Run SQL below — this never touches the student project.'
      )
      navigate(`/projects/${reviewProject.projectId}/sql`)
    } catch (err) {
      void message.error(
        err instanceof Error ? err.message : 'Could not restore the submitted database.'
      )
    } finally {
      setLoadingDb(false)
    }
  }, [selected, message, navigate])

  const handleGrade = useCallback(async () => {
    if (!selected) return
    const values = await form.validateFields()
    setGrading(true)
    try {
      const updated = await getSubmissionService().grade(
        selected.submissionId,
        values.score,
        values.feedback ?? ''
      )
      void message.success(`Marked graded (${updated.score}).`)
      setSelected(updated)
      await load()
    } catch (err) {
      void message.error(err instanceof Error ? err.message : 'Grading failed.')
    } finally {
      setGrading(false)
    }
  }, [selected, form, load, message])

  useEffect(() => {
    if (selected) {
      form.setFieldsValue({
        score: selected.score ?? undefined,
        feedback: selected.feedback
      })
    }
  }, [selected, form])

  return (
    <Drawer
      title={assignment ? `Submissions — ${assignment.title}` : 'Submissions'}
      open={open}
      onClose={onClose}
      width={760}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {loading ? (
        <Spin tip="Loading submissions…" />
      ) : submissions.length === 0 ? (
        <Empty description="No submissions yet." />
      ) : (
        <List
          size="small"
          dataSource={submissions}
          renderItem={(submission) => (
            <List.Item
              onClick={() => setSelected(submission)}
              style={{
                cursor: 'pointer',
                background: selected?.submissionId === submission.submissionId
                ? 'var(--dsw-alias-interactive-bg-active)'
                : undefined,
                padding: '8px 12px'
              }}
            >
              <Space>
                <Typography.Text code>{submission.studentUid.slice(0, 8)}…</Typography.Text>
                <Tag>v{submission.version}</Tag>
                <Typography.Text type="secondary">
                  {new Date(submission.submittedAt).toLocaleString()}
                </Typography.Text>
                {submission.status === 'graded' ? (
                  <Tag color="green">graded: {submission.score}</Tag>
                ) : (
                  <Tag color="blue">submitted</Tag>
                )}
              </Space>
            </List.Item>
          )}
        />
      )}

      {selected && (
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={5}>
            Review — v{selected.version} ({new Date(selected.submittedAt).toLocaleString()})
          </Typography.Title>
          <Descriptions
            column={1}
            size="small"
            style={{ marginBottom: 12 }}
            items={[
              {
                key: 'tables',
                label: 'Frozen ERD tables',
                children: selected.erdSnapshot.tables.map((t) => t.name).join(', ') || '—'
              },
              {
                key: 'validation',
                label: 'Validation',
                children:
                  blockingCount > 0 ? (
                    <Tag color="red">{blockingCount} blocking error(s)</Tag>
                  ) : validationIssues.length > 0 ? (
                    <Tag color="orange">{validationIssues.length} warning(s)</Tag>
                  ) : (
                    <Tag color="green">clean</Tag>
                  )
              }
            ]}
          />
          {validationIssues.length > 0 && (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              style={{ marginBottom: 12 }}
              dataSource={validationIssues.slice(0, 10)}
              columns={[
                { title: 'Severity', dataIndex: 'severity', width: 100 },
                { title: 'Issue', dataIndex: 'message' }
              ]}
            />
          )}
          <Button
            type="primary"
            icon={<DatabaseOutlined />}
            loading={loadingDb}
            onClick={() => void handleLoadDb()}
            data-testid="load-submitted-db"
          >
            Load submitted database into browser
          </Button>

          <Typography.Title level={5} style={{ marginTop: 16 }}>
            Grading
          </Typography.Title>
          <Form form={form} layout="vertical">
            <Form.Item
              label="Score (0–100)"
              name="score"
              rules={[{ required: true, message: 'Enter a score' }]}
            >
              <InputNumber min={0} max={100} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="Feedback" name="feedback">
              <Input.TextArea rows={3} placeholder="What worked well, what to improve…" />
            </Form.Item>
            <Button type="primary" loading={grading} onClick={() => void handleGrade()}>
              {selected.status === 'graded' ? 'Update grade' : 'Mark graded'}
            </Button>
          </Form>
        </div>
      )}
    </Drawer>
  )
}
