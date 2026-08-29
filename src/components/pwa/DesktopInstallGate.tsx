import { useState } from 'react'
import { Card, Typography, Button, Space, Alert, Steps, Tag, Divider, App, Row, Modal } from 'antd'
import {
  DesktopOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CloudSyncOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
  LaptopOutlined
} from '@ant-design/icons'
import { usePwaStore } from '@/stores/pwaStore'
import { AppLogo } from '@/components/AppLogo'
import { getFullVersionString } from '@/app/version'

const { Title, Paragraph, Text } = Typography

export function DesktopInstallGate() {
  const { message } = App.useApp()
  const isDesktop = usePwaStore((s) => s.isDesktop)
  const isStandalone = usePwaStore((s) => s.isStandalone)
  const deferredPrompt = usePwaStore((s) => s.deferredPrompt)
  const devBypassGate = usePwaStore((s) => s.devBypassGate)
  const promptInstall = usePwaStore((s) => s.promptInstall)
  const refreshDisplayMode = usePwaStore((s) => s.refreshDisplayMode)
  const setDevBypassGate = usePwaStore((s) => s.setDevBypassGate)

  const [installing, setInstalling] = useState(false)
  const [showManualGuideModal, setShowManualGuideModal] = useState(false)

  // Mobile devices and Standalone PWA windows bypass this gate completely
  if (!isDesktop || isStandalone || devBypassGate) {
    return null
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true)
      try {
        const installed = await promptInstall()
        if (installed) {
          void message.success('Aplikasi DBLab berhasil di-install! Silakan buka dari menu aplikasi atau desktop Anda.')
        }
      } finally {
        setInstalling(false)
      }
    } else {
      // If browser hasn't fired deferredPrompt yet or is Safari/Firefox, show manual guide modal
      setShowManualGuideModal(true)
    }
  }

  const handleRecheck = () => {
    refreshDisplayMode()
    const nowStandalone = usePwaStore.getState().isStandalone
    if (nowStandalone) {
      void message.success('Terdeteksi di aplikasi Desktop!')
    } else {
      void message.info('Aplikasi masih dibuka di tab browser biasa. Silakan install dan buka melalui jendela aplikasi DBLab.')
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'var(--dsw-alias-surface-canvas, #f0f2f5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          overflowY: 'auto'
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: 680,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)'
          }}
          bodyStyle={{ padding: '32px 28px' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Space direction="vertical" align="center" size={8}>
              <AppLogo size={48} />
              <Space style={{ marginTop: 8 }}>
                <Tag color="purple" icon={<DesktopOutlined />}>
                  Desktop Application Gate
                </Tag>
                <Tag color="blue">{getFullVersionString()}</Tag>
              </Space>
              <Title level={3} style={{ margin: '8px 0 4px 0' }}>
                DBLab Wajib Di-install di Desktop
              </Title>
              <Paragraph type="secondary" style={{ maxWidth: 520, margin: '0 auto', fontSize: 14 }}>
                Untuk menjalankan engine SQLite WASM di browser dengan performa maksimal, isolasi memori database lokal, dan fitur auto-sync yang aman, DBLab pada desktop <strong>wajib di-install dan dijalankan sebagai Aplikasi Desktop (PWA)</strong>.
              </Paragraph>
            </Space>
          </div>

          {/* Key Benefits */}
          <div
            style={{
              background: 'var(--dsw-alias-surface-card, #fafafa)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }}
          >
            <Row gutter={[12, 12]} style={{ display: 'flex', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <ThunderboltOutlined style={{ fontSize: 20, color: '#faad14' }} />
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>Performa WASM 60 FPS</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>Eksekusi SQL lokal tanpa lag</Text>
                </div>
              </div>
              <div style={{ flex: '1 1 200px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <SafetyCertificateOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>Local-First Storage</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>Penyimpanan SQLite aman di perangkat</Text>
                </div>
              </div>
              <div style={{ flex: '1 1 200px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <CloudSyncOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>Auto Update Otomatis</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>Selalu sinkron dengan rilis terbaru</Text>
                </div>
              </div>
            </Row>
          </div>

          {/* Primary Installation Action Button */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              loading={installing}
              onClick={() => void handleInstallClick()}
              style={{
                height: 48,
                padding: '0 32px',
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 24,
                boxShadow: '0 4px 14px rgba(22, 119, 255, 0.35)'
              }}
            >
              Install DBLab ke Desktop Sekarang
            </Button>
          </div>

          {/* Fallback & Quick Instructions */}
          <div style={{ marginBottom: 20 }}>
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="Cara Mudah Menginstall DBLab di Browser Anda:"
              description={
                <div style={{ marginTop: 10 }}>
                  <Steps
                    direction="vertical"
                    size="small"
                    items={[
                      {
                        title: 'Google Chrome / Microsoft Edge / Brave',
                        description: (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Klik tombol <strong>Install DBLab ke Desktop Sekarang</strong> di atas, atau klik ikon <strong>Install</strong> (📥 atau monitor berpanah ke bawah) di sebelah kanan address bar browser Anda.
                          </Text>
                        ),
                        status: 'process'
                      },
                      {
                        title: 'Safari di macOS (Sonoma atau lebih baru)',
                        description: (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Klik menu <strong>File</strong> di bilah atas → pilih <strong>Add to Dock</strong> (Tambahkan ke Dock).
                          </Text>
                        ),
                        status: 'process'
                      },
                      {
                        title: 'Buka Aplikasi DBLab',
                        description: (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Buka aplikasi DBLab yang telah terpasang di Desktop/Dock Anda untuk memulai belajar manajemen database.
                          </Text>
                        ),
                        status: 'wait'
                      }
                    ]}
                  />
                </div>
              }
            />
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* Footer info, re-check, and bypass option */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Space wrap>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleRecheck}>
                Cek Status Aplikasi
              </Button>
              <Button
                size="small"
                type="dashed"
                icon={<ArrowRightOutlined />}
                onClick={() => {
                  setDevBypassGate(true)
                  void message.info('Melanjutkan ke web browser.')
                }}
              >
                Tetap Lanjut di Web Browser
              </Button>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> Mobile Web didukung otomatis tanpa instalasi.
            </Text>
          </div>
        </Card>
      </div>

      {/* Manual Install Instruction Modal (when native prompt is not yet ready) */}
      <Modal
        open={showManualGuideModal}
        title={
          <Space>
            <LaptopOutlined style={{ color: '#1677ff' }} />
            <span>Petunjuk Instalasi Desktop</span>
          </Space>
        }
        onCancel={() => setShowManualGuideModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowManualGuideModal(false)}>
            Tutup
          </Button>,
          <Button
            key="bypass"
            type="primary"
            onClick={() => {
              setShowManualGuideModal(false)
              setDevBypassGate(true)
              void message.success('Selamat datang di DBLab!')
            }}
          >
            Lanjutkan ke Web App →
          </Button>
        ]}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 8 }}>
          <Alert
            type="info"
            showIcon
            message="Instalasi Langsung dari Browser"
            description="Browser Anda menyediakan tombol instalasi langsung pada Address Bar (Omnibox)."
          />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              📍 1. Pada Google Chrome, Edge, atau Brave:
            </Text>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
              Lihat ke ujung kanan kolom URL / address bar di bagian paling atas browser Anda. Klik ikon <strong>Install</strong> (📥 atau ikon layar komputer berpanah ke bawah), lalu pilih <strong>Install</strong>.
            </Paragraph>

            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              📍 2. Pada Safari (macOS):
            </Text>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
              Klik menu <strong>File</strong> pada menu bar paling atas macOS → klik <strong>Add to Dock</strong>.
            </Paragraph>
          </div>

          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            Setelah terinstall, buka DBLab langsung dari ikon aplikasi di Desktop / Launchpad Anda.
          </Paragraph>
        </Space>
      </Modal>
    </>
  )
}
