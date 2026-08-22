import {
  DEFAULT_SNAPSHOT_LIMITS,
  SnapshotIntegrityError,
  SnapshotOversizeError,
  type SnapshotLimits,
  type SnapshotMeta
} from './domain/snapshotModel'
import { gzipBytes, gunzipBytes, sha256Hex, supportsGzip } from './domain/bytes'
import { mergeChunks, splitIntoChunks } from './domain/chunking'
import type { CloudSnapshotAdapter } from '@/lib/firebase/snapshotAdapter'
import { reportQuotaDiagnostic } from '@/lib/diagnostics/quota'

/**
 * Snapshot orchestration (Phase 5). Corruption safety is mandatory:
 * restore verifies SHA-256 BEFORE returning bytes, so a corrupted or
 * incomplete snapshot never partially imports — the local database stays
 * untouched and the caller shows the integrity error.
 *
 * Uploads happen only on explicit user action (Save Database / submission),
 * never after individual SQL statements (quota discipline).
 */

export interface SnapshotServiceDeps {
  adapter: CloudSnapshotAdapter
  getUid: () => string | null
  limits?: SnapshotLimits
  now?: () => number
  newId?: () => string
}

export interface SaveResult {
  meta: SnapshotMeta
  oversizeWarning: boolean
}

export class SnapshotService {
  constructor(private readonly deps: SnapshotServiceDeps) {}

  private requireUid(): string {
    const uid = this.deps.getUid()
    if (!uid) throw new Error('Sign in to use cloud snapshots.')
    return uid
  }

  async save(
    projectId: string,
    bytes: Uint8Array,
    options: { kind?: SnapshotMeta['kind']; fileName?: string } = {}
  ): Promise<SaveResult> {
    const uid = this.requireUid()
    const limits = this.deps.limits ?? DEFAULT_SNAPSHOT_LIMITS

    if (bytes.byteLength > limits.blockUncompressedBytes) {
      throw new SnapshotOversizeError(bytes.byteLength, limits.blockUncompressedBytes)
    }
    const oversizeWarning = bytes.byteLength > limits.warnUncompressedBytes

    const checksum = await sha256Hex(bytes)
    const gzipped = supportsGzip() ? await gzipBytes(bytes) : bytes
    // Keep the smaller representation; pathological inputs can grow under gzip.
    const useGzip = supportsGzip() && gzipped.byteLength < bytes.byteLength
    const payload = useGzip ? gzipped : bytes

    const chunks = splitIntoChunks(payload)
    const meta: SnapshotMeta = {
      snapshotId: (this.deps.newId ?? defaultNewId)(),
      ownerUid: uid,
      projectId,
      fileName: options.fileName ?? `${projectId}.sqlite`,
      compression: useGzip ? 'gzip' : 'none',
      originalSize: bytes.byteLength,
      compressedSize: payload.byteLength,
      chunkCount: chunks.length,
      checksum,
      createdAt: new Date((this.deps.now ?? Date.now)()).toISOString(),
      kind: options.kind ?? 'manual'
    }

    await this.deps.adapter.writeSnapshot(meta, chunks)

    reportQuotaDiagnostic('snapshot.save', {
      kind: meta.kind,
      originalBytes: meta.originalSize,
      storedBytes: meta.compressedSize,
      compression: meta.compression,
      chunkCount: meta.chunkCount
    })

    // Retention: keep only the latest manual snapshot per project.
    // Submission snapshots are owned by Phase 7 and never pruned here.
    if (meta.kind === 'manual') {
      const existing = await this.deps.adapter.listManualByProject(uid, projectId)
      for (const old of existing) {
        if (old.snapshotId !== meta.snapshotId) {
          await this.deps.adapter.deleteSnapshot(old).catch(() => {
            // Cleanup failure must not break the fresh save.
          })
        }
      }
    }

    return { meta, oversizeWarning }
  }

  /**
   * Fetch, order, merge, decompress and verify a snapshot. Throws
   * SnapshotIntegrityError on any corruption; returns bytes only when the
   * SHA-256 checksum matches the metadata exactly.
   */
  async restore(snapshotId: string): Promise<Uint8Array> {
    this.requireUid()
    const meta = await this.deps.adapter.readMeta(snapshotId)
    if (!meta) throw new SnapshotIntegrityError('Snapshot metadata was not found.')

    const chunks = await this.deps.adapter.readChunks(snapshotId, meta.chunkCount)
    const missing = chunks.findIndex((chunk) => chunk === null)
    if (missing !== -1) {
      throw new SnapshotIntegrityError(`Snapshot is incomplete: chunk ${missing} is missing.`)
    }

    const merged = mergeChunks(chunks as Uint8Array[])
    let raw: Uint8Array
    try {
      raw = meta.compression === 'gzip' ? await gunzipBytes(merged) : merged
    } catch {
      throw new SnapshotIntegrityError('Snapshot could not be decompressed; the data is corrupted.')
    }

    const actual = await sha256Hex(raw)
    if (actual !== meta.checksum) {
      throw new SnapshotIntegrityError(
        'Snapshot failed SHA-256 verification; it was not imported.',
        meta.checksum,
        actual
      )
    }
    return raw
  }

  async latestManual(projectId: string): Promise<SnapshotMeta | null> {
    const uid = this.deps.getUid()
    if (!uid) return null
    const metas = await this.deps.adapter.listManualByProject(uid, projectId)
    if (metas.length === 0) return null
    return metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  }

  async delete(meta: SnapshotMeta): Promise<void> {
    this.requireUid()
    await this.deps.adapter.deleteSnapshot(meta)
  }
}

function defaultNewId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `snap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** No-op implementation for local mode. */
export class NoopSnapshotService {
  async save(): Promise<SaveResult> {
    throw new Error('Cloud snapshots require Firebase sign-in.')
  }
  async restore(): Promise<Uint8Array> {
    throw new Error('Cloud snapshots require Firebase sign-in.')
  }
  async latestManual(): Promise<SnapshotMeta | null> {
    return null
  }
  async delete(): Promise<void> {}
}

export type AnySnapshotService = SnapshotService | NoopSnapshotService
