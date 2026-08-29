import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Space, Spin, Tag, Typography } from 'antd'
import { CloudDownloadOutlined, CloudUploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { App } from 'antd'
import { getSnapshotService } from '@/lib/firebase/snapshotInstance'
import { useProjectDbStore } from '@/stores/projectDbStore'
import type { ErdProject } from '@/features/erd/domain/schema'
import {
  DEFAULT_SNAPSHOT_LIMITS,
  SnapshotIntegrityError,
  SnapshotOversizeError,
  formatBytes,
  type SnapshotMeta
} from './domain/snapshotModel'

/**
 * Cloud snapshot panel (Phase 5): explicit Save Database / Restore only —
 * never automatic. Restore verifies SHA-256 before touching the local
 * database; on failure the local database stays untouched.
 */
export function SnapshotPanel({ projectId, erd }: { projectId: string; erd: ErdProject | null }) {
  const { message, modal } = App.useApp()
  const dbStatus = useProjectDbStore((s) => s.status)
  const exportBytes = useProjectDbStore((s) => s.exportBytes)
  const importBytes = useProjectDbStore((s) => s.importBytes)
  const refreshSchema = useProjectDbStore((s) => s.refreshSchema)

  const [latest, setLatest] = useState<SnapshotMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reloadLatest = useCallback(async () => {
    setLoading(true)
    try {
      setLatest(await getSnapshotService().latestManual(projectId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load snapshot info.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reloadLatest()
  }, [reloadLatest])

  const handleSave = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const bytes = await exportBytes()
      if (!bytes) {
        void message.warning('Generate the database first — there is nothing to save yet.')
        return
      }
      const limits = DEFAULT_SNAPSHOT_LIMITS
      if (bytes.byteLength > limits.warnUncompressedBytes && bytes.byteLength <= limits.blockUncompressedBytes) {
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: 'Large database',
            content: `This database is ${formatBytes(bytes.byteLength)} uncompressed. Saving it to the cloud uses more Firestore quota. Continue?`,
            onOk: () => resolve(true),
            onCancel: () => resolve(false)
          })
        })
        if (!confirmed) return
      }

      const { meta } = await getSnapshotService().save(projectId, bytes)
      void message.success(
        `Snapshot saved: ${formatBytes(meta.originalSize)} → ${formatBytes(meta.compressedSize)} (${meta.compression}).`
      )
      await reloadLatest()
    } catch (err) {
      if (err instanceof SnapshotOversizeError) {
        setError(`Too large for cloud snapshot: ${err.message}`)
      } else {
        setError(err instanceof Error ? err.message : 'Snapshot save failed.')
      }
    } finally {
      setBusy(false)
    }
  }, [exportBytes, message, modal, projectId, reloadLatest])

  const handleRestore = useCallback(async () => {
    if (!latest) return
    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: 'Restore cloud snapshot?',
        content:
          'The current local database for this project will be replaced by the snapshot from ' +
          new Date(latest.createdAt).toLocaleString() +
          '. The checksum is verified before anything is imported.',
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
    if (!confirmed) return

    setBusy(true)
    setError(null)
    try {
      const bytes = await getSnapshotService().restore(latest.snapshotId)
      await importBytes(projectId, bytes)
      await refreshSchema(erd)
      void message.success('Snapshot restored and verified.')
    } catch (err) {
      if (err instanceof SnapshotIntegrityError) {
        setError(`Snapshot corrupted or incomplete: ${err.message} Your local database was not changed.`)
      } else {
        setError(err instanceof Error ? err.message : 'Restore failed.')
      }
    } finally {
      setBusy(false)
    }
  }, [latest, modal, importBytes, projectId, refreshSchema, erd, message])

  const handleDelete = useCallback(async () => {
    if (!latest) return
    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: 'Delete cloud snapshot?',
        content: 'This removes the snapshot and its chunks from Firestore. The local database is not affected.',
        okButtonProps: { danger: true },
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
    if (!confirmed) return
    setBusy(true)
    try {
      await getSnapshotService().delete(latest)
      void message.success('Snapshot deleted.')
      await reloadLatest()
    } finally {
      setBusy(false)
    }
  }, [latest, modal, message, reloadLatest])

  return (
    <Card
      size="small"
      title={
        <Space>
          Cloud snapshot
          <Tag color="blue">explicit save only</Tag>
        </Space>
      }
      style={{ marginTop: 12 }}
      data-testid="snapshot-panel"
    >
      {loading ? (
        <Spin size="small" />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {error && <Alert type="error" showIcon message={error} data-testid="snapshot-error" />}
          {latest ? (
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 2 }}
              items={[
                { key: 'saved', label: 'Saved', children: new Date(latest.createdAt).toLocaleString() },
                {
                  key: 'size',
                  label: 'Size',
                  children: `${formatBytes(latest.originalSize)} → ${formatBytes(latest.compressedSize)} (${latest.compression})`
                },
                { key: 'chunks', label: 'Chunks', children: String(latest.chunkCount) },
                {
                  key: 'checksum',
                  label: 'SHA-256',
                  children: <Typography.Text code copyable style={{ wordBreak: 'break-all', fontSize: 11 }}>{latest.checksum}</Typography.Text>
                }
              ]}
            />
          ) : (
            <Typography.Text type="secondary">
              No cloud snapshot yet. Save Database uploads the current SQLite file (gzipped,
              checksummed and chunked) so you can restore it on any device.
            </Typography.Text>
          )}
          <Space wrap>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              loading={busy}
              disabled={dbStatus !== 'open'}
              onClick={() => void handleSave()}
              data-testid="save-database"
            >
              Save Database
            </Button>
            <Button
              icon={<CloudDownloadOutlined />}
              loading={busy}
              disabled={!latest}
              onClick={() => void handleRestore()}
              data-testid="restore-snapshot"
            >
              Restore
            </Button>
            {latest && (
              <Button danger icon={<DeleteOutlined />} loading={busy} onClick={() => void handleDelete()}>
                Delete snapshot
              </Button>
            )}
          </Space>
        </Space>
      )}
    </Card>
  )
}
