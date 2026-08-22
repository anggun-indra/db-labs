import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { getFirebaseApp } from './config'
import { snapshotMetaSchema, type SnapshotMeta } from '@/features/snapshots/domain/snapshotModel'

/**
 * Firestore persistence for SQLite snapshots (Phase 5).
 *
 * Layout: sqliteSnapshots/{snapshotId} (metadata) with a chunks
 * subcollection holding the gzipped bytes as Firestore Bytes fields.
 * 450 KiB chunks keep every document far under the 1 MiB limit while
 * minimizing read/write counts (Spark quota discipline).
 */

export interface CloudSnapshotAdapter {
  writeSnapshot(meta: SnapshotMeta, chunks: Uint8Array[]): Promise<void>
  readMeta(snapshotId: string): Promise<SnapshotMeta | null>
  readChunks(snapshotId: string, chunkCount: number): Promise<(Uint8Array | null)[]>
  listManualByProject(ownerUid: string, projectId: string): Promise<SnapshotMeta[]>
  deleteSnapshot(meta: SnapshotMeta): Promise<void>
}

export function createSnapshotAdapter(): CloudSnapshotAdapter | null {
  const app = getFirebaseApp()
  if (!app) return null
  const db = getFirestore(app)

  return {
    async writeSnapshot(meta, chunks) {
      if (chunks.length !== meta.chunkCount) {
        throw new Error(`Chunk count mismatch: metadata says ${meta.chunkCount}, got ${chunks.length}`)
      }
      // Meta first: chunk rules check the parent's ownerUid, and restore
      // never touches chunks without valid metadata.
      const batch = writeBatch(db)
      batch.set(doc(db, 'sqliteSnapshots', meta.snapshotId), meta)
      chunks.forEach((data, index) => {
        batch.set(doc(db, 'sqliteSnapshots', meta.snapshotId, 'chunks', String(index)), {
          index,
          data
        })
      })
      await batch.commit()
    },

    async readMeta(snapshotId) {
      const snapshot = await getDoc(doc(db, 'sqliteSnapshots', snapshotId))
      if (!snapshot.exists()) return null
      const parsed = snapshotMetaSchema.safeParse(snapshot.data())
      return parsed.success ? parsed.data : null
    },

    async readChunks(snapshotId, chunkCount) {
      const chunks: (Uint8Array | null)[] = []
      for (let index = 0; index < chunkCount; index += 1) {
        const snapshot = await getDoc(doc(db, 'sqliteSnapshots', snapshotId, 'chunks', String(index)))
        if (!snapshot.exists()) {
          chunks.push(null)
          continue
        }
        const data: unknown = snapshot.data().data
        chunks.push(data instanceof Uint8Array ? data : null)
      }
      return chunks
    },

    async listManualByProject(ownerUid, projectId) {
      // Three equality filters only: no composite index needed.
      const snapshot = await getDocs(
        query(
          collection(db, 'sqliteSnapshots'),
          where('ownerUid', '==', ownerUid),
          where('projectId', '==', projectId),
          where('kind', '==', 'manual')
        )
      )
      const metas: SnapshotMeta[] = []
      snapshot.forEach((d) => {
        const parsed = snapshotMetaSchema.safeParse(d.data())
        if (parsed.success) metas.push(parsed.data)
      })
      return metas
    },

    async deleteSnapshot(meta) {
      const batch = writeBatch(db)
      for (let index = 0; index < meta.chunkCount; index += 1) {
        batch.delete(doc(db, 'sqliteSnapshots', meta.snapshotId, 'chunks', String(index)))
      }
      batch.delete(doc(db, 'sqliteSnapshots', meta.snapshotId))
      await batch.commit()
    }
  }
}
