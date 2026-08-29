import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Avatar, Layout, Menu, Space, Tag, Typography } from 'antd'
import {

  ApartmentOutlined,
  AppstoreOutlined,
  BookOutlined,
  CloudOutlined,
  ConsoleSqlOutlined,
  DashboardOutlined,
  FormOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WifiOutlined
} from '@ant-design/icons'

import { isFirebaseConfigured } from '@/lib/firebase/config'
import { useAuthStore } from '@/stores/authStore'
import { AppLogo } from '@/components/AppLogo'
import { PanelLeftIcon } from '@/components/icons/PanelLeftIcon'
import { APP_VERSION } from '@/app/version'

const { Header, Sider, Content } = Layout

/**
 * Application shell — DeepSeek-harness-style sidebar: 280px wide rail with a
 * brand row + collapse icon button, primary navigation in the middle, and
 * Settings pinned to the bottom (the dsh footArea pattern).
 * Super Admins get an administration-focused menu (Usage, List User, List Course).
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

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin'
  const searchParams = new URLSearchParams(location.search)
  const activeTab = searchParams.get('tab')

  const selectedKey = isSuperAdmin
    ? location.pathname.startsWith('/admin')
      ? activeTab === 'users'
        ? '/admin/users'
        : activeTab === 'courses'
          ? '/admin/courses'
          : '/admin'
      : location.pathname.startsWith('/profile')
        ? '/profile'
        : location.pathname.startsWith('/settings')
          ? '/settings'
          : '/admin'
    : location.pathname.endsWith('/sql')
      ? '/lab'
      : location.pathname.startsWith('/projects')
        ? '/projects'
        : location.pathname.startsWith('/assignments')
          ? '/assignments'
          : location.pathname.startsWith('/courses')
            ? '/courses'
            : location.pathname.startsWith('/admin')
              ? '/admin'
              : location.pathname.startsWith('/settings')
                ? '/settings'
                : location.pathname.startsWith('/profile')
                  ? '/profile'
                  : '/'

  const adminNavItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: <Link to="/admin">Usage & Quotas</Link>,
      title: 'Free Tier Firebase usage, quotas & storage cleanup'
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: <Link to="/admin?tab=users">List User</Link>,
      title: 'View and manage registered users'
    },
    {
      key: '/admin/courses',
      icon: <BookOutlined />,
      label: <Link to="/admin?tab=courses">List Course</Link>,
      title: 'View all academic courses & enrollment statistics'
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">Profile</Link>,
      title: 'Admin profile and account details'
    }
  ]

  const standardNavItems = [
    {
      key: '/',
      icon: <AppstoreOutlined />,
      label: <Link to="/">Dashboard</Link>
    },
    {
      key: '/courses',
      icon: <BookOutlined />,
      label: <Link to="/courses">Courses</Link>,
      title: 'View your enrolled courses'
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
      key: '/assignments',
      icon: <FormOutlined />,
      label: <Link to="/assignments">Assignments</Link>,
      title:
        mode === 'local'
          ? 'Assignments arrive once Firebase is configured'
          : undefined
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">Profile</Link>,
      title:
        mode === 'local'
          ? 'Local mode — sign-in available once Firebase is configured'
          : undefined
    },
    ...(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'lecturer'
      ? [
          {
            key: '/admin',
            icon: <SafetyCertificateOutlined />,
            label: <Link to="/admin">Admin Tools</Link>,
            title: 'Firebase Quota & Space Manager'
          }
        ]
      : [])
  ]

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        theme="light"
        className="app-sider"
        width={280}
        collapsedWidth={56}
        trigger={null}
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          zIndex: 100
        }}
      >
        <div className={collapsed ? 'app-logo app-logo--collapsed' : 'app-logo'}>
          {collapsed ? (
            <button
              type="button"
              className="app-sider__toggle app-sider__toggle--rail"
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
            >
              <span className="app-sider__rail-mark">
                <AppLogo size={24} />
              </span>
              <span className="app-sider__panel-icon">
                <PanelLeftIcon size={18} />
              </span>
            </button>
          ) : (
            <>
              <Link to={isSuperAdmin ? "/admin" : "/"} className="app-logo__brand">
                <AppLogo size={26} />
                <span className="app-logo__text">DBLab</span>
              </Link>
              <button
                type="button"
                className="app-sider__toggle"
                aria-label="Collapse sidebar"
                onClick={() => setCollapsed(true)}
              >
                <PanelLeftIcon size={18} />
              </button>
            </>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', borderRight: 0 }}
          selectedKeys={[selectedKey === '/settings' ? '' : selectedKey]}
          items={isSuperAdmin ? adminNavItems : standardNavItems}
        />

        <div className="app-sider__foot">
          <Link
            to="/settings"
            className={
              selectedKey === '/settings'
                ? 'app-sider__settings app-sider__settings--active'
                : 'app-sider__settings'
            }
            title="Settings"
          >
            <SettingOutlined className="app-sider__settings-icon" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </Sider>
      <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 90, flex: 'none' }}>
          <span className="app-header__title-wrap">
            <Typography.Text className="app-header__title">
              Database Management Labs
            </Typography.Text>
            <Tag className="app-header__version" bordered={false}>
              v{APP_VERSION}
            </Tag>
          </span>
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
                <Link to="/profile" className="app-header__link">
                  <Space size={6}>
                    <Avatar size="small" src={user.photoURL ?? undefined} icon={<UserOutlined />} />
                    <span className="app-header__user-label">{user.displayName || user.email || 'Account'}</span>
                  </Space>
                </Link>
              ) : (
                <Link to="/profile" className="app-header__link">
                  <Space size={6}>
                    <CloudOutlined />
                    <span className="app-header__user-label">Sign in</span>
                  </Space>
                </Link>
              ))}
          </Space>
        </Header>
        <Content className="app-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

