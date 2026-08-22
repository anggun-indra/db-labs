import { erdProjectSchema } from '@/features/erd/domain/schema'
import { reportQuotaDiagnostic } from '@/lib/diagnostics/quota'
import type { ProjectRepository } from '@/lib/persistence/localProjectRepository'
import type { CloudProjectAdapter, RemoteProjectDoc } from './cloudAdapter'

/**
 * Project sync (Phase 4). Local storage stays the source of truth for the
 * UI; Firestore is a write-behind mirror of ERD/project metadata only.
 * SQLite bytes never leave the browser (spec §3) — cloud snapshots arrive
 * in Phase 5 as a separate, explicit flow.
 *
 * Strategy (phase-4 doc): edit -> local persistence -> dirty -> debounce
 * 5 s -> Firestore write. Last-write-wins by updatedAt; a remote document
 * older than the local copy is skipped, so stale remote state never
 * silently overwrites newer local work.
 */

export const SYNC_DEBOUNCE_MS = 5000

export type SyncState = 'idle' | 'pending' | 'syncing' | 'synced' | 'offline' | 'error'

export interface SyncStatus {
  state: SyncState
  message?: string
}

export interface ProjectSyncDeps {
  adapter: CloudProjectAdapter
  repo: ProjectRepository
  getUid: () => string | null
  isOnline: () => boolean
  now?: () => number
  debounceMs?: number
}

export interface PullReport {
  imported: number
  skippedLocalNewer: number
  malformed: number
}

export class ProjectSyncService {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private pending = new Set<string>()
  private listeners = new Set<(status: SyncStatus) => void>()
  private status: SyncStatus = { state: 'idle' }

  constructor(private readonly deps: ProjectSyncDeps) {}

  getStatus(): SyncStatus {
    return this.status
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setStatus(status: SyncStatus): void {
    this.status = status
    for (const listener of this.listeners) listener(status)
  }

  /** Debounced write-behind after a local save. */
  schedulePush(projectId: string): void {
    const uid = this.deps.getUid()
    if (!uid) return
    this.pending.add(projectId)
    reportQuotaDiagnostic('sync.schedule', { projectId, pending: this.pending.size })

    if (!this.deps.isOnline()) {
      this.setStatus({ state: 'offline', message: 'Changes are kept locally and sync later.' })
      return
    }

    this.setStatus({ state: 'pending' })
    const debounceMs = this.deps.debounceMs ?? SYNC_DEBOUNCE_MS
    const existing = this.timers.get(projectId)
    if (existing) clearTimeout(existing)
    this.timers.set(
      projectId,
      setTimeout(() => {
        this.timers.delete(projectId)
        void this.pushNow(projectId)
      }, debounceMs)
    )
  }

  /** Explicit flush (Save button, important navigation, logout). */
  async pushNow(projectId: string): Promise<void> {
    const uid = this.deps.getUid()
    if (!uid) return
    const timer = this.timers.get(projectId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(projectId)
    }

    if (!this.deps.isOnline()) {
      this.pending.add(projectId)
      this.setStatus({ state: 'offline', message: 'Offline — changes sync when back online.' })
      return
    }

    const project = await this.deps.repo.loadProject(projectId)
    if (!project) {
      this.pending.delete(projectId)
      return
    }

    const parsed = erdProjectSchema.safeParse(project)
    if (!parsed.success) {
      this.setStatus({ state: 'error', message: 'Project failed validation and was not synced.' })
      return
    }

    const summaries = await this.deps.repo.listProjects()
    const summary = summaries.find((s) => s.id === projectId)
    const nowIso = new Date((this.deps.now ?? Date.now)()).toISOString()

    this.setStatus({ state: 'syncing' })
    try {
      const doc: RemoteProjectDoc = {
        projectId,
        ownerUid: uid,
        name: project.name,
        createdAt: summary?.createdAt ?? nowIso,
        updatedAt: summary?.updatedAt ?? nowIso,
        erd: parsed.data
      }
      await this.deps.adapter.pushProject(doc)
      reportQuotaDiagnostic('sync.push', { projectId })
      this.pending.delete(projectId)
      this.setStatus({ state: this.pending.size > 0 ? 'pending' : 'synced' })
    } catch (error) {
      this.setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Sync failed.'
      })
    }
  }

  /** Push everything that is pending (used when connectivity returns). */
  async flushPending(): Promise<void> {
    if (!this.deps.isOnline()) return
    const ids = [...this.pending]
    for (const id of ids) {
      await this.pushNow(id)
    }
  }

  /**
   * Hydrate local storage from Firestore (sign-in, app start). Remote docs
   * are validated; older remote copies never overwrite newer local work.
   */
  async pullAndMerge(): Promise<PullReport> {
    const uid = this.deps.getUid()
    const report: PullReport = { imported: 0, skippedLocalNewer: 0, malformed: 0 }
    if (!uid) return report

    let docs: RemoteProjectDoc[]
    try {
      docs = await this.deps.adapter.pullProjects(uid)
    } catch {
      this.setStatus({ state: 'error', message: 'Could not reach Firestore.' })
      return report
    }

    for (const remote of docs) {
      const local = await this.deps.repo.loadProject(remote.projectId)
      if (local) {
        const summaries = await this.deps.repo.listProjects()
        const localUpdated = summaries.find((s) => s.id === remote.projectId)?.updatedAt ?? ''
        if (localUpdated >= remote.updatedAt) {
          report.skippedLocalNewer += 1
          continue
        }
      }
      // Re-validate defensively even though the adapter already parsed it.
      const parsed = erdProjectSchema.safeParse(remote.erd)
      if (!parsed.success) {
        report.malformed += 1
        continue
      }
      await this.deps.repo.saveProject({ ...parsed.data, name: remote.name })
      report.imported += 1
    }

    if (this.status.state !== 'error') this.setStatus({ state: 'synced' })
    return report
  }

  async deleteRemote(projectId: string): Promise<void> {
    const uid = this.deps.getUid()
    if (!uid) return
    this.pending.delete(projectId)
    const timer = this.timers.get(projectId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(projectId)
    }
    try {
      await this.deps.adapter.deleteProject(uid, projectId)
    } catch {
      // Local deletion already succeeded; remote cleanup failure is not fatal.
    }
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    this.pending.clear()
    this.listeners.clear()
  }
}

/** No-op sync used in local mode so call sites stay unconditional. */
const NOOP_STATUS: SyncStatus = Object.freeze({ state: 'idle' })
const NOOP_UNSUBSCRIBE = () => undefined
const NOOP_REPORT: PullReport = Object.freeze({ imported: 0, skippedLocalNewer: 0, malformed: 0 })

export class NoopProjectSyncService {
  getStatus(): SyncStatus {
    // Must be referentially stable: consumed via useSyncExternalStore.
    return NOOP_STATUS
  }
  subscribe(): () => void {
    return NOOP_UNSUBSCRIBE
  }
  schedulePush(): void {}
  async pushNow(): Promise<void> {}
  async flushPending(): Promise<void> {}
  async pullAndMerge(): Promise<PullReport> {
    return NOOP_REPORT
  }
  async deleteRemote(): Promise<void> {}
  dispose(): void {}
}

export type AnyProjectSync = ProjectSyncService | NoopProjectSyncService
