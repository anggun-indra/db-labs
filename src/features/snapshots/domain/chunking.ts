/**
 * Chunking for Firestore snapshot uploads (Phase 5). Firestore documents are
 * limited to 1 MiB; chunk payloads are stored as Firestore Bytes, so we pick
 * 450 KiB per chunk (inside the 400–500 KiB plan) to stay far below the cap
 * while keeping the chunk count small for quota purposes.
 */

export const CHUNK_SIZE = 450 * 1024

export function splitIntoChunks(bytes: Uint8Array, chunkSize: number = CHUNK_SIZE): Uint8Array[] {
  if (chunkSize <= 0) throw new Error('chunkSize must be positive')
  if (bytes.byteLength === 0) return [new Uint8Array(0)]
  const chunks: Uint8Array[] = []
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    chunks.push(bytes.subarray(offset, Math.min(offset + chunkSize, bytes.byteLength)))
  }
  return chunks
}

export function mergeChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}
