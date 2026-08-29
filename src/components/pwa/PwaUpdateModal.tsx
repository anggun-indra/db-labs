import { useState } from 'react'
import { Modal, Typography, Button, Space, Tag, Alert } from 'antd'
import { CloudSyncOutlined, RocketOutlined } from '@ant-design/icons'
import { usePwaStore } from '@/stores/pwaStore'
import { getFullVersionString } from '@/app/version'

const { Title, Paragraph, Text } = Typography

export function PwaUpdateModal() {
  const needRefresh = usePwaStore((s) => s.needRefresh)
  const updateApp = usePwaStore((s) => s.updateApp)
  const [updating, setUpdating] = useState(false)

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      await updateApp()
    } catch (err) {
      console.error('[pwa] Update failed:', err)
      window.location.reload()
    }
  }

  return (
    <Modal
      open={needRefresh}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      width="min(500px, 95vw)"
      centered
    >
      <div style={{ textAlign: 'center', padding: '16px 8px 8px 8px' }}>
        <Space direction="vertical" size="middle" align="center" style={{ width: '100%' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(22, 119, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CloudSyncOutlined style={{ fontSize: 32, color: '#1677ff' }} />
          </div>

          <div>
            <Title level={4} style={{ margin: '0 0 4px 0' }}>
              Pembaruan DBLab Tersedia
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Versi terbaru telah dideploy ke Firebase
            </Text>
          </div>

          <Space>
            <Tag color="blue">{getFullVersionString()}</Tag>
            <Tag color="green">Rilis Baru</Tag>
          </Space>

          <Alert
            type="info"
            showIcon
            message="Pembaruan Wajib (Force Update)"
            description="Terdapat pembaruan fitur dan sistem pada DBLab. Silakan muat ulang aplikasi untuk langsung menggunakan versi terbaru."
            style={{ textAlign: 'left', width: '100%' }}
          />

          <Button
            type="primary"
            size="large"
            icon={<RocketOutlined />}
            loading={updating}
            onClick={() => void handleUpdate()}
            block
            style={{
              height: 44,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 8,
              marginTop: 8
            }}
          >
            Perbarui Aplikasi Sekarang
          </Button>

          <Paragraph type="secondary" style={{ fontSize: 11, margin: 0 }}>
            Semua progres ERD lokal yang tersimpan akan tetap aman setelah pembaruan.
          </Paragraph>
        </Space>
      </div>
    </Modal>
  )
}
