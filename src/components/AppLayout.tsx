import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Layout, Menu, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  ConsoleSqlOutlined,
  DatabaseOutlined,
  UserOutlined
} from '@ant-design/icons'
import { isFirebaseConfigured } from '@/lib/firebase/config'

const { Header, Sider, Content } = Layout

/**
 * Application shell with the student navigation suggested by spec §32.
 * Database Lab / Profile entries are placeholders until later phases.
 */
export function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const selectedKey = location.pathname.startsWith('/projects')
    ? '/projects'
    : location.pathname.startsWith('/lab')
      ? '/lab'
      : '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        theme="dark"
      >
        <div className="app-logo">
          <DatabaseOutlined style={{ fontSize: 22, color: '#fff' }} />
          {!collapsed && <span className="app-logo__text">Database Learning Lab</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: '/',
              icon: <AppstoreOutlined />,
              label: <Link to="/">Dashboard</Link>
            },
            {
              key: '/projects',
              icon: <ApartmentOutlined />,
              label: <Link to="/projects">My Projects</Link>
            },
            {
              key: '/lab',
              icon: <ConsoleSqlOutlined />,
              label: 'Database Lab',
              disabled: true,
              title: 'Arrives in Phase 3 (SQL Playground)'
            },
            {
              key: '/profile',
              icon: <UserOutlined />,
              label: 'Profile',
              disabled: true,
              title: 'Arrives in Phase 4 (Firebase Auth)'
            }
          ]}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Text style={{ color: '#fff' }}>
            Manajemen Database — Database Management for Digital Business
          </Typography.Text>
          <Tag color={isFirebaseConfigured() ? 'green' : 'blue'}>
            {isFirebaseConfigured() ? 'cloud connected' : 'local mode'}
          </Tag>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
