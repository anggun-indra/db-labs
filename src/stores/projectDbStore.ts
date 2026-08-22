import { create } from 'zustand'
import { sqliteService } from '@/lib/sqlite/sqlJsRuntime'
import type { TableInfo } from '@/lib/sqlite/schemaIntrospect'
import { detectSchemaDrift, type DriftReport } from '@/lib/sqlite/schemaDrift'
import type { ErdProject } from '@/features/erd/domain/schema'

/**
 * Local SQLite database lifecycle state for one project (Phase 2).
 * The heavy lifting lives in lib/sqlite; this store only tracks UI state.
 */

export type DbStatus = 'unknown' | 'none' | 'loading' | 'open' | 'error'

interface ProjectDbState {
  projectId: string | null
  status: DbStatus
  storageKind: string
  error: string | null
  schema: TableInfo[]
  drift: DriftReport | null

  /** Try to open the stored database; leaves status 'none' when absent. */
  openFor(projectId: string): Promise<void>
  /** Create (or rebuild) the database from generated DDL. */
  createFromDdl(projectId: string, ddl: string): Promise<void>
  importBytes(projectId: string, bytes: Uint8Array): Promise<void>
  resetDb(projectId: string): Promise<void>
  refreshSchema(erd: ErdProject | null): Promise<void>
  exportBytes(): Promise<Uint8Array | null>
  close(): Promise<void>
}

export const useProjectDbStore = create<ProjectDbState>()((set, get) => {
  function applyOpenState(erd: ErdProject | null): void {
    const schema = sqliteService.introspect()
    set({
      status: 'open',
      storageKind: sqliteService.storageKind(),
      schema,
      drift: erd ? detectSchemaDrift(erd, schema) : null,
      error: null
    })
  }

  return {
    projectId: null,
    status: 'unknown',
    storageKind: 'unknown',
    error: null,
    schema: [],
    drift: null,

    async openFor(projectId) {
      set({ status: 'loading', projectId, error: null, drift: null, schema: [] })
      try {
        const opened = await sqliteService.open(projectId)
        if (!opened) {
          set({ status: 'none', storageKind: sqliteService.storageKind() })
          return
        }
        applyOpenState(null)
      } catch (error) {
        set({ status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    },

    async createFromDdl(projectId, ddl) {
      set({ status: 'loading', projectId, error: null })
      try {
        await sqliteService.create(projectId, ddl)
        applyOpenState(null)
      } catch (error) {
        set({ status: 'error', error: error instanceof Error ? error.message : String(error) })
        throw error
      }
    },

    async importBytes(projectId, bytes) {
      set({ status: 'loading', projectId, error: null })
      try {
        await sqliteService.importDatabase(projectId, bytes)
        applyOpenState(null)
      } catch (error) {
        set({ status: 'error', error: error instanceof Error ? error.message : String(error) })
        throw error
      }
    },

    async resetDb(projectId) {
      await sqliteService.reset(projectId)
      set({ status: 'none', schema: [], drift: null, projectId, error: null })
    },

    async refreshSchema(erd) {
      if (get().status !== 'open') return
      const schema = sqliteService.introspect()
      set({ schema, drift: erd ? detectSchemaDrift(erd, schema) : null })
    },

    async exportBytes() {
      try {
        return await sqliteService.exportDatabase()
      } catch {
        return null
      }
    },

    async close() {
      await sqliteService.close()
      set({ projectId: null, status: 'unknown', schema: [], drift: null, error: null })
    }
  }
})
