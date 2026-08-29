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
  Tag,
  Typography
} from 'antd'
import {
  GoogleOutlined,
  InfoCircleOutlined,
  LaptopOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { getRoleMeta } from '@/lib/firebase/roles'
import './profile.css'

/**
 * Profile & sign-in page (Phase 4 / Phase 8 Generic Roles).
 * - Auto-registration for new users is exclusively via Google Auth (defaults to 'student').
 * - Email & Password users are provisioned by the Super Admin or directly in Firebase Auth.
 * - Roles: super_admin, lecturer (instruktur), student (peserta).
 */
export function ProfilePage() {
  const { user, initializing, mode, authError, online } = useAuthStore()
  const [busy, setBusy] = useState(false)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)
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
    const roleMeta = getRoleMeta(user.role)

    return (
      <div className="profile-page">
        <Card title="Profil Pengguna" className="profile-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space align="center" wrap>
              <Avatar size={56} src={user.photoURL ?? undefined} icon={<UserOutlined />} />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {user.displayName || roleMeta.shortLabel}
                </Typography.Title>
                <Typography.Text type="secondary">{user.email || 'Tanpa email'}</Typography.Text>
              </div>
              <Tag color={roleMeta.color}>{roleMeta.label}</Tag>
            </Space>

            <Descriptions
              column={1}
              size="small"
              bordered
              items={[
                { key: 'uid', label: 'User ID (Firebase UID)', children: user.uid },
                {
                  key: 'role',
                  label: 'Peran / Role Akun',
                  children: (
                    <Space direction="vertical" size={2}>
                      <Tag color={roleMeta.color}>{roleMeta.label}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {roleMeta.description}
                      </Typography.Text>
                    </Space>
                  )
                },
                {
                  key: 'sync',
                  label: 'Status Cloud Sync',
                  children: online
                    ? 'Aktif — Proyek ERD & SQLite snapshots tersinkronisasi ke cloud'
                    : 'Offline — Perubahan akan disinkronkan saat online'
                }
              ]}
            />

            {!online && (
              <Alert
                type="warning"
                showIcon
                message="Anda sedang offline"
                description="Tetap dapat bekerja: ERD, SQLite WASM dan SQL Playground berjalan 100% lokal di browser. Perubahan akan disinkronkan saat terhubung kembali."
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
      <Card title="Sign in ke Database Learning Lab" className="profile-card">
        {authError && (
          <Alert type="error" showIcon message={authError} style={{ marginBottom: 16 }} />
        )}

        <div style={{ marginBottom: 20 }}>
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            loading={busy}
            onClick={() => void run(signInWithGoogle)}
            block
            data-testid="google-sign-in"
            style={{ height: 44, fontSize: 15 }}
          >
            Masuk dengan Google (Google Auth)
          </Button>
          <Typography.Text
            type="secondary"
            style={{ display: 'block', textAlign: 'center', marginTop: 6, fontSize: 12 }}
          >
            Pendaftaran akun otomatis untuk pengguna baru (role Peserta / Student).
          </Typography.Text>
        </div>

        <Divider plain style={{ margin: '16px 0' }}>
          atau masuk dengan Email terdaftar
        </Divider>

        <EmailAuthForm
          busy={busy}
          onSubmit={(email, password) => void run(() => signInWithEmail(email, password))}
        />

        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginTop: 16 }}
          message="Ketentuan Pendaftaran Akun"
          description="Pendaftaran mandiri otomatis hanya tersedia via Google Auth. Akun dengan Email & Password didaftarkan langsung oleh Super Admin di panel manajemen atau dibuat di Firebase Console."
        />
      </Card>
    </div>
  )
}

function EmailAuthForm({
  busy,
  onSubmit
}: {
  busy: boolean
  onSubmit: (email: string, password: string) => void
}) {
  const [form] = Form.useForm()

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values: { email: string; password: string }) =>
        onSubmit(values.email, values.password)
      }
    >
      <Form.Item
        label="Alamat Email Terdaftar"
        name="email"
        rules={[
          { required: true, message: 'Masukkan email Anda' },
          { type: 'email', message: 'Format email tidak valid' }
        ]}
      >
        <Input placeholder="nama@email.com" autoComplete="email" size="middle" />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, min: 6, message: 'Masukkan password minimal 6 karakter' }]}
      >
        <Input.Password autoComplete="current-password" size="middle" />
      </Form.Item>

      <Button type="primary" htmlType="submit" block loading={busy} size="middle">
        Masuk dengan Email
      </Button>
    </Form>
  )
}
