import { useCallback, useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Result,
  Space,
  Tabs,
  Tag,
  Typography
} from 'antd'
import {
  CloudOutlined,
  GoogleOutlined,
  LaptopOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import './profile.css'

/**
 * Profile & sign-in page (Phase 4). Firebase UID is the canonical identity;
 * roles are granted server-side only (self sign-up is always 'student').
 * In local mode the page explains that everything keeps working offline.
 */
export function ProfilePage() {
  const { user, initializing, mode, authError, online } = useAuthStore()
  const [busy, setBusy] = useState(false)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail)
  const signOutUser = useAuthStore((s) => s.signOutUser)

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true)
      try {
        await fn()
      } finally {
        setBusy(false)
      }
    },
    []
  )

  if (!isFirebaseConfigured() || mode === 'local') {
    return (
      <div className="page-centered" data-testid="profile-local-mode">
        <Result
          icon={<LaptopOutlined />}
          title="Local mode"
          subTitle="Firebase is not configured for this deployment, so the app runs fully local: ERD projects, the SQLite database and SQL history stay on this device. Sign-in and cloud sync are unavailable until an administrator adds Firebase configuration."
        />
      </div>
    )
  }

  if (initializing) {
    return (
      <div className="page-centered">
        <Typography.Text type="secondary">Checking sign-in status…</Typography.Text>
      </div>
    )
  }

  if (user) {
    return (
      <div className="profile-page">
        <Card title="Your profile" className="profile-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space align="center">
              <Avatar size={56} src={user.photoURL ?? undefined} icon={<CloudOutlined />} />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {user.displayName || 'Student'}
                </Typography.Title>
                <Typography.Text type="secondary">{user.email}</Typography.Text>
              </div>
              <Tag color={user.role === 'lecturer' ? 'purple' : 'blue'}>{user.role}</Tag>
            </Space>
            <Descriptions
              column={1}
              size="small"
              bordered
              items={[
                { key: 'uid', label: 'User ID (Firebase UID)', children: user.uid },
                {
                  key: 'sync',
                  label: 'Cloud sync',
                  children: online ? 'Enabled — projects mirror to Firestore' : 'Offline — changes sync later'
                },
                {
                  key: 'role',
                  label: 'Role',
                  children:
                    'Roles are granted server-side by the course administrator. Students always get full access to their own projects.'
                }
              ]}
            />
            {!online && (
              <Alert
                type="warning"
                showIcon
                message="You are offline"
                description="Keep working: ERD editing, SQLite and SQL all run locally. Changes sync to Firestore automatically when you are back online."
              />
            )}
            <Button
              icon={<LogoutOutlined />}
              danger
              loading={busy}
              onClick={() => void run(signOutUser)}
            >
              Sign out
            </Button>
          </Space>
        </Card>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <Card title="Sign in to DBLab" className="profile-card">
        {authError && (
          <Alert type="error" showIcon message={authError} style={{ marginBottom: 16 }} />
        )}
        <Button
          type="primary"
          size="large"
          icon={<GoogleOutlined />}
          loading={busy}
          onClick={() => void run(signInWithGoogle)}
          block
          data-testid="google-sign-in"
        >
          Sign in with Google
        </Button>
        <Divider plain>or use email</Divider>
        <Tabs
          items={[
            {
              key: 'signin',
              label: 'Sign in',
              children: (
                <EmailAuthForm
                  mode="signin"
                  busy={busy}
                  onSubmit={(email, password) => void run(() => signInWithEmail(email, password))}
                />
              )
            },
            {
              key: 'signup',
              label: 'Create account',
              children: (
                <EmailAuthForm
                  mode="signup"
                  busy={busy}
                  onSubmit={(email, password, name) =>
                    void run(() => signUpWithEmail(name ?? '', email, password))
                  }
                />
              )
            }
          ]}
        />
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          message="Works offline too"
          description="You can always use the app in local mode without an account. Signing in mirrors your ERD projects to Firestore so you can continue on another device."
        />
      </Card>
    </div>
  )
}

function EmailAuthForm({
  mode,
  busy,
  onSubmit
}: {
  mode: 'signin' | 'signup'
  busy: boolean
  onSubmit: (email: string, password: string, name?: string) => void
}) {
  const [form] = Form.useForm()
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values: { name?: string; email: string; password: string }) =>
        onSubmit(values.email, values.password, values.name)
      }
    >
      {mode === 'signup' && (
        <Form.Item
          label="Display name"
          name="name"
          rules={[{ required: true, message: 'Enter your name' }]}
        >
          <Input placeholder="e.g. Budi Santoso" />
        </Form.Item>
      )}
      <Form.Item
        label="Email"
        name="email"
        rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
      >
        <Input placeholder="you@student.ac.id" autoComplete="email" />
      </Form.Item>
      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}
      >
        <Input.Password autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
      </Form.Item>
      <Button type="primary" htmlType="submit" block loading={busy}>
        {mode === 'signup' ? 'Create account' : 'Sign in'}
      </Button>
    </Form>
  )
}
