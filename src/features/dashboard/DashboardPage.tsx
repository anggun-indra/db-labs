import { Link } from 'react-router-dom'
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  CloudUploadOutlined,
  ConsoleSqlOutlined,
  DatabaseOutlined,
  RocketOutlined
} from '@ant-design/icons'

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
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <ApartmentOutlined />
                  ERD Designer
                </Space>
              }
              extra={<Tag color="success">Available</Tag>}
            >
              <Typography.Paragraph type="secondary">
                Draw tables, columns, keys and relationships visually. Validation gives instant
                feedback.
              </Typography.Paragraph>
              <Link to="/projects">
                <Button type="primary" icon={<RocketOutlined />}>
                  Open my projects
                </Button>
              </Link>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <DatabaseOutlined />
                  SQLite Playground
                </Space>
              }
              extra={<Tag>Phase 2–3</Tag>}
            >
              <Typography.Paragraph type="secondary">
                Generate CREATE TABLE statements from your ERD, insert data and run real SQL on a
                SQLite database in your browser.
              </Typography.Paragraph>
              <Button disabled icon={<ConsoleSqlOutlined />}>
                Coming soon
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <CloudUploadOutlined />
                  Assignments
                </Space>
              }
              extra={<Tag>Phase 4–7</Tag>}
            >
              <Typography.Paragraph type="secondary">
                Sign in with your campus account, receive assignments and submit your database work
                to your lecturer.
              </Typography.Paragraph>
              <Button disabled>Coming soon</Button>
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
