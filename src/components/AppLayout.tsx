import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Avatar, Layout, Menu, Space, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CloudOutlined,
  ConsoleSqlOutlined,
  FormOutlined,
  SettingOutlined,
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
 * Settings pinned to the bottom (the dsh footArea pattern). The Database Lab
 * entry leads to project selection: the SQL Playground is always bound to
 * one project. Profile (Phase 4) hosts sign-in and account details; in local
 * mode it explains that everything stays on-device.
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
      : location.pathname.startsWith('/assignments')
        ? '/assignments'
        : location.pathname.startsWith('/settings')
          ? '/settings'
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
        theme="light"
        className="app-sider"
        width={280}
        collapsedWidth={56}
        trigger={null}
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
              <Link to="/" className="app-logo__brand">
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
          selectedKeys={[selectedKey === '/settings' ? '' : selectedKey]}
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
            }
          ]}
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
      <Layout>
        <Header className="app-header">
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
                    <span>{user.displayName || user.email || 'Account'}</span>
                  </Space>
                </Link>
              ) : (
                <Link to="/profile" className="app-header__link">
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
