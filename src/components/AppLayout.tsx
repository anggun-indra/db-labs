import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Avatar, Layout, Menu, Space, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CloudOutlined,
  ConsoleSqlOutlined,
  DatabaseOutlined,
  UserOutlined,
  WifiOutlined
} from '@ant-design/icons'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { useAuthStore } from '@/stores/authStore'

const { Header, Sider, Content } = Layout

/**
 * Application shell with the student navigation suggested by spec §32.
 * The Database Lab entry leads to project selection: the SQL Playground is
 * always bound to one project. Profile (Phase 4) hosts sign-in and account
 * details; in local mode it explains that everything stays on-device.
 */
export function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const user = useAuthStore((s) => s.user)
  const online = useAuthStore((s) => s.online)
  const mode = useAuthStore((s) => s.mode)
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    void initAuth()
  }, [initAuth])

  const selectedKey = location.pathname.endsWith('/sql')
    ? '/lab'
    : location.pathname.startsWith('/projects')
      ? '/projects'
      : location.pathname.startsWith('/profile')
        ? '/profile'
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
              label: <Link to="/projects">Database Lab</Link>,
              title: 'Open a project, then use its SQL Playground'
            },
            {
              key: '/profile',
              icon: <UserOutlined />,
              label: <Link to="/profile">Profile</Link>,
              title:
                mode === 'local'
                  ? 'Local mode — sign-in available once Firebase is configured'
                  : undefined
            }
          ]}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Text style={{ color: '#fff' }}>
            Manajemen Database — Database Management for Digital Business
          </Typography.Text>
          <Space>
            {!online && (
              <Tag color="orange" icon={<WifiOutlined />}>
                offline
              </Tag>
            )}
            <Tag color={isFirebaseConfigured() ? 'green' : 'blue'}>
              {isFirebaseConfigured() ? 'cloud connected' : 'local mode'}
            </Tag>
            {mode === 'firebase' &&
              (user ? (
                <Link to="/profile" style={{ color: '#fff' }}>
                  <Space size={6}>
                    <Avatar size="small" src={user.photoURL ?? undefined} icon={<UserOutlined />} />
                    <span>{user.displayName || user.email || 'Account'}</span>
                  </Space>
                </Link>
              ) : (
                <Link to="/profile" style={{ color: '#fff' }}>
                  <Space size={6}>
                    <CloudOutlined />
                    <span>Sign in</span>
                  </Space>
                </Link>
              ))}
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
