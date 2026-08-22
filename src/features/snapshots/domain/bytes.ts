/**
 * Byte utilities for Phase 5 cloud snapshots: gzip compression and SHA-256
 * checksums. Both use platform APIs (CompressionStream / crypto.subtle) —
 * no dependencies, offline-capable, and feature-detected so constrained
 * environments fall back to uncompressed snapshots instead of crashing.
 */

export type CompressionKind = 'gzip' | 'none'

export function supportsGzip(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

export function supportsSha256(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.digest === 'function'
}

async function streamThrough(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      parts.push(value)
      total += value.byteLength
    }
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    merged.set(part, offset)
    offset += part.byteLength
  }
  return merged
}

export async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (!supportsGzip()) return bytes
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  return streamThrough(stream)
}

export async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (!supportsGzip()) return bytes
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return streamThrough(stream)
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!supportsSha256()) {
    throw new Error('SHA-256 is unavailable in this environment; snapshots are disabled.')
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
