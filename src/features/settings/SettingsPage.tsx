import { useState } from 'react'
import { App, Tag, Typography } from 'antd'
import { CloudOutlined, SettingOutlined } from '@ant-design/icons'
import { isFirebaseConfigured, firebaseConfig } from '@/lib/firebase/config'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'
import './settings.css'

/**
 * Settings page styled after the DeepSeek harness settings dialog:
 * a left navigation rail plus content panels. The General panel hosts
 * Appearance (theme cubes: Light / Dark / System), mirroring the dsw
 * theme picker; Connection reports the Firebase wiring state.
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
  return (
    <div className="dsw-settings__content">
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        General
      </Typography.Title>
      <AppearanceGroup />
      <div className="dsw-settings__group">
        <div className="dsw-settings__group-title">Language</div>
        <Typography.Text type="secondary">
          Interface language follows the course material (English). Bahasa Indonesia support is on
          the roadmap.
        </Typography.Text>
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
