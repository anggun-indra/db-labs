/**
 * Local persistence for SQLite database bytes (spec §13).
 *
 * Preferred backend: OPFS. Fallback: IndexedDB. Both store one database per
 * project id, so a browser refresh keeps the exact same database.
 */

export type DbStorageKind = 'opfs' | 'indexeddb' | 'memory'

export interface DatabaseByteStorage {
  readonly kind: DbStorageKind
  load(projectId: string): Promise<Uint8Array | null>
  save(projectId: string, bytes: Uint8Array): Promise<void>
  delete(projectId: string): Promise<void>
}

const DB_DIR = 'dblab-databases'
const IDB_NAME = 'dblab-databases'
const IDB_STORE = 'databases'

function safeFileName(projectId: string): string {
  return encodeURIComponent(projectId).replace(/[^A-Za-z0-9._-]/g, '_')
}

function detectOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof (navigator.storage as { getDirectory?: unknown }).getDirectory === 'function'
  )
}

function detectIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

/** In-memory storage: last resort + used by unit tests. Data does not survive reloads. */
export class MemoryDatabaseByteStorage implements DatabaseByteStorage {
  readonly kind = 'memory' as const
  private map = new Map<string, Uint8Array>()

  async load(projectId: string): Promise<Uint8Array | null> {
    return this.map.get(projectId) ?? null
  }
  async save(projectId: string, bytes: Uint8Array): Promise<void> {
    this.map.set(projectId, bytes)
  }
  async delete(projectId: string): Promise<void> {
    this.map.delete(projectId)
  }
}

class OpfsDatabaseByteStorage implements DatabaseByteStorage {
  readonly kind = 'opfs' as const

  private async fileHandle(projectId: string, create: boolean): Promise<FileSystemFileHandle> {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle(DB_DIR, { create })
    return dir.getFileHandle(`${safeFileName(projectId)}.sqlite`, { create })
  }

  async load(projectId: string): Promise<Uint8Array | null> {
    try {
      const handle = await this.fileHandle(projectId, false)
      const file = await handle.getFile()
      return new Uint8Array(await file.arrayBuffer())
    } catch {
      return null
    }
  }

  async save(projectId: string, bytes: Uint8Array): Promise<void> {
    const handle = await this.fileHandle(projectId, true)
    const writable = await handle.createWritable()
    await writable.write(bytes)
    await writable.close()
  }

  async delete(projectId: string): Promise<void> {
    try {
      const root = await navigator.storage.getDirectory()
      const dir = await root.getDirectoryHandle(DB_DIR, { create: false })
      await dir.removeEntry(`${safeFileName(projectId)}.sqlite`)
    } catch {
      // already absent
    }
  }
}

class IndexedDbDatabaseByteStorage implements DatabaseByteStorage {
  readonly kind = 'indexeddb' as const

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(IDB_STORE)) {
          request.result.createObjectStore(IDB_STORE)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private run(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
    return this.openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, mode)
          const request = action(tx.objectStore(IDB_STORE))
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
          tx.oncomplete = () => db.close()
        })
    )
  }

  async load(projectId: string): Promise<Uint8Array | null> {
    try {
      const result = await this.run('readonly', (store) => store.get(projectId))
      return result instanceof Uint8Array ? result : null
    } catch {
      return null
    }
  }

  async save(projectId: string, bytes: Uint8Array): Promise<void> {
    await this.run('readwrite', (store) => store.put(bytes, projectId))
  }

  async delete(projectId: string): Promise<void> {
    await this.run('readwrite', (store) => store.delete(projectId))
  }
}

export function detectDbStorageKind(): DbStorageKind {
  if (detectOpfs()) return 'opfs'
  if (detectIndexedDb()) return 'indexeddb'
  return 'memory'
}

export function createDatabaseByteStorage(): DatabaseByteStorage {
  switch (detectDbStorageKind()) {
    case 'opfs':
      return new OpfsDatabaseByteStorage()
    case 'indexeddb':
      return new IndexedDbDatabaseByteStorage()
    default:
      return new MemoryDatabaseByteStorage()
  }
}
