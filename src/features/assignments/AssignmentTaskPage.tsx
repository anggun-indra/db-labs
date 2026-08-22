/**
 * Student assignment task page (Phase 6+).
 * Shows mission-style tasks with step-by-step guidance, hints, and helper resources.
 * Similar to Google QwikLabs but focused on database management.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Button, Card, Col, Divider, Drawer, Input, List, message, Progress, Row, Space, Tag, Typography, Alert
} from 'antd'
import { 
  CheckCircleOutlined, ClockCircleOutlined, StarOutlined, 
  QuestionCircleOutlined, DatabaseOutlined, ConsoleSqlOutlined, 
  BookOutlined, RocketOutlined, ArrowRightOutlined
} from '@ant-design/icons'
import { UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { useCourseService, type CourseAdapter } from '@/lib/firebase/courseAdapter'
import type { EnhancedAssignment, TaskProgress } from '@/features/assignments/domain/courseModels'

export function AssignmentTaskPage() {
  const { courseId, assignmentId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  
  // Create service instance safely
  const courseServiceRef = useRef<CourseAdapter | null>(createCourseAdapter())
  const courseService = courseServiceRef.current || {
    async getMyProgress(u, c, a) { return []; }
  }
  
  const [assignment, setAssignment] = useState<EnhancedAssignment | null>(null)
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [notes, setNotes] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssignment()
    loadMyProgress()
  }, [courseId, assignmentId])

  async function loadAssignment() {
    try {
      // Fetch would go here
      setAssignment({
        title: 'Database Fundamentals',
        description: 'Learn core SQL concepts',
        tasks: [
          {
            taskId: 'task-1',
            assignmentId: 'assign-1',
            title: 'Create Your First Table',
            description: 'Design and create an ERD table schema',
            steps: [
              'Open the ERD designer',
              'Add a new table named "Users"',
              'Create columns: id (PK), name, email, created_at'
            ],
            hints: ['Use the toolbar to add columns quickly'],
            helpLinks: [],
            maxScore: 100
          }
        ],
        helperGuide: {
          overview: 'This mission teaches you how to design database tables.',
          prerequisites: ['Understanding of basic SQL syntax'],
          estimatedTime: '30 minutes',
          resources: []
        }
      })
    } catch (error) {
      console.error(error)
      message.error('Failed to load assignment')
    }
  }

  async function loadMyProgress() {
    if (!courseId || !assignmentId) return
    try {
      const progress = await courseService.getMyProgress(user!.uid, courseId, assignmentId)
      setTaskProgress(progress)
      
      if (progress.length === 0 && assignment?.tasks.length) {
        await courseService.recordTaskStarted(
          user!.uid, courseId!, assignmentId!, assignment.tasks[0].taskId
        )
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = taskProgress.length 
    ? Math.round(taskProgress.filter((t: TaskProgress) => t.status === 'completed').length / taskProgress.length * 100)
    : 0

  const currentTask = assignment?.tasks[currentStep] || null

  async function handleStepComplete() {
    if (!currentTask || !user || !courseId || !assignmentId) return
    
    try {
      await courseService.recordTaskCompleted(user.uid, courseId, assignmentId, currentTask.taskId)
      message.success('Step completed! Great job! 🎉')
      
      if (currentStep < (assignment?.tasks.length || 0) - 1) {
        setCurrentStep(currentStep + 1)
        
        await courseService.recordTaskStarted(
          user.uid, courseId, assignmentId, assignment!.tasks[currentStep + 1].taskId
        )
      }
    } catch (error) {
      console.error(error)
      message.error('Failed to save progress')
    }
  }

  async function handleNoteChange(note: string) {
    setNotes(note)
    try {
      if (currentTask && user && courseId && assignmentId) {
        await courseService.addStudentNote(user.uid, courseId, assignmentId, currentTask.taskId, note)
      }
    } catch (error) {
      console.error(error)
    }
  }

  function getStepIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
      case 'in-progress':
        return <ClockCircleOutlined style={{ color: '#faad14', fontSize: 20 }} />
      default:
        return <QuestionCircleOutlined style={{ color: '#d9d9d9', fontSize: 20 }} />
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="assignment-task-page">
      {/* Header with Progress */}
      <Card className="task-header">
        <Space align="center" style={{ width: '100%' }}>
          <DatabaseOutlined style={{ fontSize: 32, color: '#4176e6' }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {assignment?.title}
          </Typography.Title>
          <Progress 
            percent={progressPercent} 
            showInfo={false} 
            strokeColor="#4176e6" 
            trailColor="#f0f0f0"
            size="small"
            style={{ flex: 1, maxWidth: 400, marginLeft: 24 }}
          />
          <Tag icon={<StarOutlined />} color="gold">{taskProgress.filter(t => t.status === 'completed').length}/{assignment?.tasks.length || 0} steps</Tag>
        </Space>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Left Panel: Task Instructions */}
        <Col span={16}>
          {/* Helper Guide Overview */}
          {assignment?.helperGuide.overview && (
            <Card title={<><BookOutlined /> Mission Briefing</>} className="mission-card">
              <Typography.Paragraph>{assignment.helperGuide.overview}</Typography.Paragraph>
              
              {assignment.helperGuide.prerequisites.length > 0 && (
                <Alert
                  message="Before you start"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {assignment.helperGuide.prerequisites.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  }
                  type="info"
                />
              )}

              <Divider />
              <Typography.Text type="secondary">
                Estimated time: {assignment.helperGuide.estimatedTime}
              </Typography.Text>
            </Card>
          )}

          {/* Current Step Instructions */}
          {currentTask && (
            <Card 
              className="task-instructions"
              extra={
                <Button 
                  type="primary" 
                  onClick={handleStepComplete}
                  disabled={currentTask.status !== 'in-progress'}
                >
                  Complete This Step <ArrowRightOutlined />
                </Button>
              }
            >
              <Typography.Title level={5}>
                Step {currentStep + 1}: {currentTask.title}
              </Typography.Title>

              <Typography.Paragraph>{currentTask.description}</Typography.Paragraph>

              <List
                size="small"
                dataSource={currentTask.steps}
                renderItem={(step: string, index: number) => (
                  <List.Item>
                    <span style={{ marginRight: 8 }}>{index + 1}.</span>
                    {step}
                  </List.Item>
                )}
              />

              {currentTask.hints.length > 0 && (
                <Alert
                  message="💡 Hints"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {currentTask.hints.map((hint: string, i: number) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  }
                  icon={<QuestionCircleOutlined />}
                  type="warning"
                />
              )}

              <Divider>Your Notes</Divider>
              <Input.TextArea
                placeholder="Type notes here... They're saved automatically."
                value={notes}
                onChange={(e) => handleNoteChange(e.target.value)}
                rows={4}
              />
            </Card>
          )}

          <Card title={<><ConsoleSqlOutlined /> Database Tools</>} >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<DatabaseOutlined />} block>
                View Database Structure
              </Button>
              <Button icon={<ConsoleSqlOutlined />} block>
                Run SQL Queries
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Right Panel: Checklist & Resources */}
        <Col span={8}>
          <Card title={<><RocketOutlined /> Task Checklist</>} bodyStyle={{ padding: 0 }}>
            <List
              dataSource={assignment?.tasks || []}
              renderItem={(task: any, index: number) => {
                const myProgress = taskProgress.find(p => p.taskId === task.taskId)
                const status = myProgress?.status || 'pending'
                
                return (
                  <List.Item
                    className={`task-checklist-item ${status}`}
                    style={{
                      cursor: 'pointer',
                      background: index === currentStep ? '#e6f7ff' : 'transparent',
                      padding: '16px 24px'
                    }}
                    onClick={() => setCurrentStep(index)}
                  >
                    <Space align="start" style={{ width: '100%' }}>
                      <Space>{getStepIcon(status)}</Space>
                      <div style={{ flex: 1 }}>
                        <Typography.Text strong>{task.title}</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                          {status === 'completed' ? '✓ Completed' : 
                           status === 'in-progress' ? '🔄 In progress' : 
                           '⏳ Not started'}
                        </Typography.Text>
                      </div>
                    </Space>
                  </List.Item>
                )
              }}
            />
          </Card>

          <Card title="Your Progress">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Progress percent={progressPercent} strokeLinecap="round" strokeWidth={8} />
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
                {Math.max(0, (assignment?.tasks.length || 0) - progressPercent)}% remaining
              </Typography.Paragraph>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Footer */}
      <Card className="task-footer">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={() => navigate(`/courses/${courseId}/assignments`)}>← Back to Courses</Button>
          <Space>
            <Button onClick={() => setDrawerOpen(true)}>Need Help?</Button>
          </Space>
        </Space>
      </Card>

      {/* Help Drawer */}
      <Drawer
        title="Getting Help"
        placement="right"
        width={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="Tip #1: Read the entire assignment first"
            type="info"
          />
          
          <Alert
            message="Tip #2: Use the hint system"
            type="success"
          />

          <Alert
            message="Tip #3: Ask your instructor"
            type="warning"
          />
        </Space>
      </Drawer>
    </div>
  )
}

// Need to import these for the adapter functions
import { useRef } from 'react'
import { createCourseAdapter } from '@/lib/firebase/courseAdapter'
