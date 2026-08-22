import { z } from 'zod'

/**
 * Snapshot metadata model (Phase 5). Mirrors FIRESTORE-DATA-MODEL.md:
 * sqliteSnapshots/{snapshotId} + chunks subcollection.
 */

export const SNAPSHOT_KINDS = ['manual', 'submission'] as const

export const snapshotMetaSchema = z.object({
  snapshotId: z.string().min(1),
  ownerUid: z.string().min(1),
  projectId: z.string().min(1),
  fileName: z.string(),
  compression: z.enum(['gzip', 'none']),
  originalSize: z.number().int().nonnegative(),
  compressedSize: z.number().int().nonnegative(),
  chunkCount: z.number().int().positive(),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
  createdAt: z.string(),
  kind: z.enum(SNAPSHOT_KINDS)
})

export type SnapshotMeta = z.infer<typeof snapshotMetaSchema>

/** Size limits, configurable per the phase doc (3 MB warn / 5 MB block). */
export interface SnapshotLimits {
  warnUncompressedBytes: number
  blockUncompressedBytes: number
}

export const DEFAULT_SNAPSHOT_LIMITS: SnapshotLimits = {
  warnUncompressedBytes: 3 * 1024 * 1024,
  blockUncompressedBytes: 5 * 1024 * 1024
}

export class SnapshotOversizeError extends Error {
  constructor(
    public readonly size: number,
    public readonly limit: number
  ) {
    super(`Database is ${size} bytes uncompressed; cloud snapshots are limited to ${limit}.`)
    this.name = 'SnapshotOversizeError'
  }
}

export class SnapshotIntegrityError extends Error {
  constructor(
    message: string,
    public readonly expectedChecksum?: string,
    public readonly actualChecksum?: string
  ) {
    super(message)
    this.name = 'SnapshotIntegrityError'
  }
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KiB`
  return `${(size / (1024 * 1024)).toFixed(2)} MiB`
}
