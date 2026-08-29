import { Link } from 'react-router-dom'
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  BookOutlined,
  CloudUploadOutlined,
  ConsoleSqlOutlined,
  DatabaseOutlined,
  RocketOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { isFirebaseConfigured } from '@/lib/firebase/config'

/**
 * Student dashboard (spec §33) - intentionally simple for Phase 0/1. It will
 * show pending assignments and due dates once Phase 6 lands.
 */
export function DashboardPage() {
  return (
    <div className="page-narrow">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            DBLab
          </Typography.Title>
          <Typography.Text type="secondary">
            Manajemen Database — learn by doing: design an ERD, generate a real SQLite database and
            practice SQL, right in your browser.
          </Typography.Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              title={
                <Space>
                  <ApartmentOutlined />
                  ERD Designer
                </Space>
              }
              extra={<Tag color="success">Available</Tag>}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <Typography.Paragraph type="secondary">
                Draw tables, columns, keys and relationships visually. Validation gives instant
                feedback.
              </Typography.Paragraph>
              <div>
                <Link to="/projects">
                  <Button type="primary" icon={<RocketOutlined />} block>
                    Open my projects
                  </Button>
                </Link>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              title={
                <Space>
                  <DatabaseOutlined />
                  SQLite Playground
                </Space>
              }
              extra={<Tag color="green">Ready</Tag>}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <Typography.Paragraph type="secondary">
                  Generate CREATE TABLE statements from your ERD, insert data and run real SQL on a
                  SQLite database in your browser.
                </Typography.Paragraph>
              </div>
              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                <Link to="/projects">
                  <Button type="primary" icon={<ConsoleSqlOutlined />} block>
                    Open SQL Playground
                  </Button>
                </Link>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Open or create a project first.
                </Typography.Text>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              title={
                <Space>
                  <BookOutlined />
                  My Courses
                </Space>
              }
              extra={<Tag color="blue">New!</Tag>}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <Typography.Paragraph type="secondary">
                Enrolled courses with assignments and guided tasks to learn database management.
              </Typography.Paragraph>
              <div>
                {!isFirebaseConfigured() ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    <Button disabled icon={<RocketOutlined />} block>
                      Login Required
                    </Button>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Sign in with Firebase to view courses.
                    </Typography.Text>
                  </Space>
                ) : (
                  <Link to="/courses">
                    <Button type="primary" icon={<RocketOutlined />} block>
                      View Courses
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              title={
                <Space>
                  <CloudUploadOutlined />
                  Assignments
                </Space>
              }
              extra={<Tag color="blue">Beta</Tag>}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <Typography.Paragraph type="secondary">
                Sign in with your campus account, receive assignments and submit your database work
                to your lecturer.
              </Typography.Paragraph>
              <div>
                {!isFirebaseConfigured() ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    <Button
                      danger
                      icon={<WarningOutlined />}
                      disabled
                      block
                    >
                      Coming soon
                    </Button>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Configure Firebase in Settings first.
                    </Typography.Text>
                  </Space>
                ) : (
                  <Link to="/assignments">
                    <Button type="primary" icon={<RocketOutlined />} block>
                      View Assignments
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        <Card size="small">
          <Typography.Text type="secondary">
            Offline note: the ERD designer works fully offline and saves locally in this browser.
            Cloud sync (Firebase) is added in a later phase.
          </Typography.Text>
        </Card>
      </Space>
    </div>
  )
}
