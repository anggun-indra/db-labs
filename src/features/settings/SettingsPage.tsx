import { useState } from 'react'
import { App, Button, Space, Tag, Typography, Alert } from 'antd'
import {
  CloudOutlined,
  SettingOutlined,
  SyncOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { isFirebaseConfigured, firebaseConfig } from '@/lib/firebase/config'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'
import { usePwaStore } from '@/stores/pwaStore'
import { APP_VERSION, BUILD_TIME, BUILD_HASH } from '@/app/version'
import { checkForAppUpdates, forceAppUpdate } from '@/app/pwa'
import './settings.css'

/**
 * Settings page styled after the DeepSeek harness settings dialog:
 * a left navigation rail plus content panels. The General panel hosts
 * Appearance, Versioning, PWA Check/Force Update; Connection reports
 * the Firebase wiring state.
 */

type SettingsSection = 'general' | 'connection'

const NAV_ITEMS: { key: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: <SettingOutlined /> },
  { key: 'connection', label: 'Connection', icon: <CloudOutlined /> }
]

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('general')

  return (
    <div className="dsw-settings" data-testid="settings-page">
      <nav className="dsw-settings__rail" aria-label="Settings sections">
        <div className="dsw-settings__rail-title">Settings</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={
              item.key === section
                ? 'dsw-settings__nav-cell dsw-settings__nav-cell--active'
                : 'dsw-settings__nav-cell'
            }
            aria-current={item.key === section ? 'page' : undefined}
            onClick={() => setSection(item.key)}
          >
            <span className="dsw-settings__nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="dsw-settings__panel">
        {section === 'general' ? <GeneralPanel /> : <ConnectionPanel />}
      </div>
    </div>
  )
}

function GeneralPanel() {
  const { message } = App.useApp()
  const needRefresh = usePwaStore((s) => s.needRefresh)
  const isStandalone = usePwaStore((s) => s.isStandalone)
  const isDesktop = usePwaStore((s) => s.isDesktop)

  const [checking, setChecking] = useState(false)
  const [forcing, setForcing] = useState(false)

  const handleCheckUpdates = async () => {
    setChecking(true)
    try {
      const result = await checkForAppUpdates()
      if (result.hasUpdate) {
        void message.info('Pembaruan aplikasi versi baru tersedia di server!')
      } else {
        void message.success('Aplikasi Anda sudah menggunakan versi terbaru.')
      }
    } catch {
      void message.error('Gagal memeriksa pembaruan server.')
    } finally {
      setChecking(false)
    }
  }

  const handleForceUpdate = async () => {
    setForcing(true)
    try {
      void message.loading('Memuat ulang aplikasi ke versi terbaru...')
      await forceAppUpdate()
    } catch {
      window.location.reload()
    } finally {
      setForcing(false)
    }
  }

  return (
    <div className="dsw-settings__content">
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        General
      </Typography.Title>
      
      <AppearanceGroup />

      <div className="dsw-settings__group">
        <div className="dsw-settings__group-title">Language</div>
        <Typography.Text type="secondary">
          Interface language follows the course material (English / Bahasa Indonesia).
        </Typography.Text>
      </div>

      <div className="dsw-settings__group">
        <div className="dsw-settings__group-title">PWA & System Updates</div>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space wrap size="small" align="center">
            <Tag color="blue">v{APP_VERSION}</Tag>
            {needRefresh ? (
              <Tag color="orange" icon={<SyncOutlined spin />}>
                Pembaruan Tersedia
              </Tag>
            ) : (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Versi Terbaru
              </Tag>
            )}
            <Tag icon={isStandalone ? <DesktopOutlined /> : <GlobalOutlined />}>
              {isStandalone ? 'PWA Standalone Window' : 'Web Browser Tab'}
            </Tag>
          </Space>

          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            Build: {BUILD_TIME ? new Date(BUILD_TIME).toLocaleString() : 'dev'} · Hash: {BUILD_HASH}
          </Typography.Text>

          {needRefresh && (
            <Alert
              type="warning"
              showIcon
              message="Rilis baru telah terdeteksi"
              description="Silakan klik tombol 'Perbarui Sekarang' untuk menerapkan versi terbaru."
              style={{ margin: '8px 0' }}
            />
          )}

          <Space wrap style={{ marginTop: 8 }}>
            <Button
              icon={<SyncOutlined spin={checking} />}
              loading={checking}
              onClick={() => void handleCheckUpdates()}
            >
              Periksa Pembaruan
            </Button>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              loading={forcing}
              onClick={() => void handleForceUpdate()}
            >
              Paksa Muat Ulang (Force Update)
            </Button>
          </Space>

          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            {isDesktop
              ? 'Di desktop, DBLab berjalan sebagai aplikasi PWA terisolasi untuk eksekusi SQLite WASM lokal yang stabil.'
              : 'Di mobile, DBLab berjalan responsif di browser tanpa instalasi.'}
          </Typography.Paragraph>
        </Space>
      </div>
    </div>
  )
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; swatchClass: string }[] = [
  { mode: 'light', label: 'Light', swatchClass: 'dsw-theme-cube__swatch--light' },
  { mode: 'dark', label: 'Dark', swatchClass: 'dsw-theme-cube__swatch--dark' },
  { mode: 'system', label: 'System', swatchClass: 'dsw-theme-cube__swatch--system' }
]

function AppearanceGroup() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const { message } = App.useApp()

  return (
    <div className="dsw-settings__group">
      <div className="dsw-settings__group-title">Appearance</div>
      <div className="dsw-theme-cube__row" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={mode === option.mode}
            className={
              mode === option.mode
                ? 'dsw-theme-cube dsw-theme-cube--selected'
                : 'dsw-theme-cube'
            }
            onClick={() => {
              setMode(option.mode)
              void message.success(`Theme: ${option.label}`)
            }}
          >
            <span className={`dsw-theme-cube__swatch ${option.swatchClass}`} aria-hidden />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ConnectionPanel() {
  const configured = isFirebaseConfigured()
  return (
    <div className="dsw-settings__content">
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        Connection
      </Typography.Title>
      <div className="dsw-settings__group">
        <div className="dsw-settings__group-title">Cloud sync</div>
        <p>
          <Tag color={configured ? 'green' : 'blue'}>
            {configured ? 'cloud connected' : 'local mode'}
          </Tag>
        </p>
        <Typography.Text type="secondary">
          {configured
            ? `Projects mirror to Firebase project “${firebaseConfig.projectId}”. Data stays in
              your account; the app keeps working offline and syncs when you are back online.`
            : 'Everything is stored on this device only. Ask your lecturer for the Firebase web ' +
              'configuration to enable cloud sync and classroom assignments.'}
        </Typography.Text>
      </div>
    </div>
  )
}
