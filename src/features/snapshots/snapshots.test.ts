// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { gzipBytes, gunzipBytes, sha256Hex, supportsGzip } from './domain/bytes'
import { CHUNK_SIZE, mergeChunks, splitIntoChunks } from './domain/chunking'
import { SnapshotService } from './snapshotService'
import type { CloudSnapshotAdapter } from '@/lib/firebase/snapshotAdapter'
import {
  SnapshotIntegrityError,
  SnapshotOversizeError,
  snapshotMetaSchema,
  type SnapshotMeta
} from './domain/snapshotModel'

/**
 * Phase 5 snapshot tests: compression round trips, chunking, checksums,
 * corruption detection, oversize rejection and retention. Runs against an
 * in-memory fake adapter — no Firebase required.
 */

class FakeSnapshotAdapter implements CloudSnapshotAdapter {
  metas = new Map<string, SnapshotMeta>()
  chunks = new Map<string, Uint8Array[]>()

  async writeSnapshot(meta: SnapshotMeta, chunks: Uint8Array[]): Promise<void> {
    this.metas.set(meta.snapshotId, { ...meta })
    this.chunks.set(meta.snapshotId, chunks.map((c) => new Uint8Array(c)))
  }

  async readMeta(snapshotId: string): Promise<SnapshotMeta | null> {
    return this.metas.get(snapshotId) ?? null
  }

  async readChunks(snapshotId: string, chunkCount: number): Promise<(Uint8Array | null)[]> {
    const stored = this.chunks.get(snapshotId) ?? []
    return Array.from({ length: chunkCount }, (_, index) => stored[index] ?? null)
  }

  async listManualByProject(ownerUid: string, projectId: string): Promise<SnapshotMeta[]> {
    return [...this.metas.values()].filter(
      (meta) => meta.ownerUid === ownerUid && meta.projectId === projectId && meta.kind === 'manual'
    )
  }

  async deleteSnapshot(meta: SnapshotMeta): Promise<void> {
    this.metas.delete(meta.snapshotId)
    this.chunks.delete(meta.snapshotId)
  }
}

let idCounter = 0
function makeService(adapter = new FakeSnapshotAdapter(), limits?: { warnUncompressedBytes: number; blockUncompressedBytes: number }) {
  return {
    adapter,
    service: new SnapshotService({
      adapter,
      getUid: () => 'user-1',
      limits,
      now: () => 1700000000000 + idCounter,
      newId: () => `snap-${++idCounter}`
    })
  }
}

function sampleBytes(size: number, seed = 7): Uint8Array {
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i += 1) bytes[i] = (i * seed) % 251
  return bytes
}

/** Incompressible payload: guarantees chunk counts survive gzip. */
function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  // getRandomValues caps at 65,536 bytes per call.
  for (let offset = 0; offset < size; offset += 65536) {
    crypto.getRandomValues(bytes.subarray(offset, Math.min(offset + 65536, size)))
  }
  return bytes
}

describe('bytes', () => {
  it('gzip/gunzip round trip restores identical bytes', async () => {
    if (!supportsGzip()) return
    const original = sampleBytes(64 * 1024)
    const compressed = await gzipBytes(original)
    expect(compressed.byteLength).toBeLessThan(original.byteLength)
    const restored = await gunzipBytes(compressed)
    expect(restored).toEqual(original)
  })

  it('computes the known SHA-256 of the empty input', async () => {
    await expect(sha256Hex(new Uint8Array(0))).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
  })
})

describe('chunking', () => {
  it('splits and merges losslessly with chunks at most CHUNK_SIZE', () => {
    const original = sampleBytes(CHUNK_SIZE * 2 + 12345)
    const chunks = splitIntoChunks(original)
    expect(chunks.length).toBe(3)
    for (const chunk of chunks) expect(chunk.byteLength).toBeLessThanOrEqual(CHUNK_SIZE)
    expect(mergeChunks(chunks)).toEqual(original)
  })

  it('keeps empty payloads as a single empty chunk', () => {
    const chunks = splitIntoChunks(new Uint8Array(0))
    expect(chunks.length).toBe(1)
    expect(chunks[0].byteLength).toBe(0)
  })

  it('honours custom chunk sizes (measured chunking behavior)', () => {
    const original = sampleBytes(1000)
    const chunks = splitIntoChunks(original, 300)
    expect(chunks.map((c) => c.byteLength)).toEqual([300, 300, 300, 100])
    expect(mergeChunks(chunks)).toEqual(original)
  })
})

describe('SnapshotService save/restore', () => {
  it('round trips a database through metadata + chunks', async () => {
    const { service } = makeService()
    const original = randomBytes(500_000)

    const { meta } = await service.save('proj-1', original)
    expect(snapshotMetaSchema.parse(meta)).toEqual(meta)
    expect(meta.originalSize).toBe(original.byteLength)
    expect(meta.checksum).toBe(await sha256Hex(original))
    expect(meta.chunkCount).toBeGreaterThan(1)
    expect(meta.compressedSize).toBeLessThanOrEqual(original.byteLength)

    const restored = await service.restore(meta.snapshotId)
    expect(restored).toEqual(original)
  })

  it('detects a corrupted chunk via checksum mismatch', async () => {
    const { service, adapter } = makeService()
    const original = sampleBytes(200_000)
    const { meta } = await service.save('proj-1', original)

    const stored = adapter.chunks.get(meta.snapshotId)!
    stored[0][0] = stored[0][0] ^ 0xff

    await expect(service.restore(meta.snapshotId)).rejects.toThrow(SnapshotIntegrityError)
  })

  it('detects missing chunks as incomplete snapshots', async () => {
    const { service, adapter } = makeService()
    const original = randomBytes(CHUNK_SIZE + 10)
    const { meta } = await service.save('proj-1', original)
    expect(meta.chunkCount).toBe(2)

    adapter.chunks.get(meta.snapshotId)!.pop()
    await expect(service.restore(meta.snapshotId)).rejects.toThrow(/incomplete/i)
  })

  it('rejects oversize databases before uploading anything', async () => {
    const { service, adapter } = makeService(undefined, {
      warnUncompressedBytes: 100,
      blockUncompressedBytes: 1000
    })
    await expect(service.save('proj-1', sampleBytes(1001))).rejects.toThrow(SnapshotOversizeError)
    expect(adapter.metas.size).toBe(0)
  })

  it('reports an oversize warning between warn and block limits', async () => {
    const { service } = makeService(undefined, {
      warnUncompressedBytes: 100,
      blockUncompressedBytes: 1_000_000
    })
    const { oversizeWarning } = await service.save('proj-1', sampleBytes(500))
    expect(oversizeWarning).toBe(true)
  })

  it('requires sign-in', async () => {
    const adapter = new FakeSnapshotAdapter()
    const service = new SnapshotService({ adapter, getUid: () => null })
    await expect(service.save('proj-1', sampleBytes(10))).rejects.toThrow(/sign in/i)
  })
})

describe('SnapshotService retention', () => {
  it('keeps only the latest manual snapshot per project', async () => {
    const { service, adapter } = makeService()
    const first = await service.save('proj-1', sampleBytes(1000))
    const second = await service.save('proj-1', sampleBytes(2000))

    expect(adapter.metas.size).toBe(1)
    expect(adapter.metas.has(first.meta.snapshotId)).toBe(false)
    expect(adapter.metas.has(second.meta.snapshotId)).toBe(true)

    const latest = await service.latestManual('proj-1')
    expect(latest?.snapshotId).toBe(second.meta.snapshotId)
  })

  it('never prunes submission snapshots', async () => {
    const { service, adapter } = makeService()
    await service.save('proj-1', sampleBytes(1000), { kind: 'submission' })
    await service.save('proj-1', sampleBytes(2000), { kind: 'submission' })
    expect(adapter.metas.size).toBe(2)
  })

  it('keeps manual snapshots of other projects untouched', async () => {
    const { service, adapter } = makeService()
    await service.save('proj-1', sampleBytes(1000))
    await service.save('proj-2', sampleBytes(1000))
    expect(adapter.metas.size).toBe(2)
  })
})
