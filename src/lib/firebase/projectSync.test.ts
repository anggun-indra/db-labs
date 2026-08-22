// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectSyncService, SYNC_DEBOUNCE_MS } from './projectSync'
import type { CloudProjectAdapter, RemoteProjectDoc } from './cloudAdapter'
import { LocalProjectRepository } from '@/lib/persistence/localProjectRepository'
import { createProject } from '@/features/erd/domain/factory'
import type { ErdProject } from '@/features/erd/domain/schema'

/**
 * Phase 4 sync logic: debounced write-behind, offline queueing,
 * last-write-wins pull merge and malformed document rejection.
 * Runs against an in-memory fake CloudProjectAdapter — no Firebase needed.
 */

class FakeAdapter implements CloudProjectAdapter {
  docs = new Map<string, RemoteProjectDoc>()
  failNext = false
  pullCalls = 0

  async pullProjects(uid: string): Promise<RemoteProjectDoc[]> {
    this.pullCalls += 1
    return [...this.docs.values()].filter((d) => d.ownerUid === uid)
  }

  async pushProject(doc: RemoteProjectDoc): Promise<void> {
    if (this.failNext) {
      this.failNext = false
      throw new Error('network down')
    }
    this.docs.set(doc.projectId, doc)
  }

  async deleteProject(uid: string, projectId: string): Promise<void> {
    const existing = this.docs.get(projectId)
    if (existing && existing.ownerUid === uid) this.docs.delete(projectId)
  }
}

function makeService(opts?: { uid?: string | null; online?: boolean; adapter?: FakeAdapter }) {
  const adapter = opts?.adapter ?? new FakeAdapter()
  const repo = new LocalProjectRepository(window.localStorage)
  let uid: string | null = opts?.uid === undefined ? 'user-1' : opts.uid
  let online = opts?.online ?? true
  const service = new ProjectSyncService({
    adapter,
    repo,
    getUid: () => uid,
    isOnline: () => online,
    now: () => 1700000000000,
    debounceMs: SYNC_DEBOUNCE_MS
  })
  return {
    service,
    adapter,
    repo,
    setUid: (value: string | null) => {
      uid = value
    },
    setOnline: (value: boolean) => {
      online = value
    }
  }
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ProjectSyncService.schedulePush', () => {
  it('debounces the Firestore write by 5 seconds', async () => {
    const { service, adapter, repo } = makeService()
    const project = createProject('Warung')
    await repo.saveProject(project)

    service.schedulePush(project.projectId)
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS - 10)
    expect(adapter.docs.size).toBe(0)

    await vi.advanceTimersByTimeAsync(20)
    expect(adapter.docs.size).toBe(1)
    const doc = adapter.docs.get(project.projectId)!
    expect(doc.ownerUid).toBe('user-1')
    expect(doc.name).toBe('Warung')
    expect(doc.erd.projectId).toBe(project.projectId)
    expect(service.getStatus().state).toBe('synced')
  })

  it('coalesces rapid edits into one write', async () => {
    const { service, adapter, repo } = makeService()
    const project = createProject('Warung')
    await repo.saveProject(project)
    const pushSpy = vi.spyOn(adapter, 'pushProject')

    service.schedulePush(project.projectId)
    vi.advanceTimersByTime(2000)
    service.schedulePush(project.projectId)
    vi.advanceTimersByTime(2000)
    service.schedulePush(project.projectId)
    expect(pushSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS)
    await vi.runAllTimersAsync()
    expect(pushSpy).toHaveBeenCalledTimes(1)
  })

  it('does nothing when signed out', async () => {
    const { service, adapter, repo, setUid } = makeService()
    const project = createProject('Warung')
    await repo.saveProject(project)
    setUid(null)

    service.schedulePush(project.projectId)
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS * 3)
    await vi.runAllTimersAsync()
    expect(adapter.docs.size).toBe(0)
  })

  it('queues writes while offline and flushes when back online', async () => {
    const { service, adapter, repo, setOnline } = makeService({ online: false })
    const project = createProject('Warung')
    await repo.saveProject(project)

    service.schedulePush(project.projectId)
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS * 3)
    await vi.runAllTimersAsync()
    expect(adapter.docs.size).toBe(0)
    expect(service.getStatus().state).toBe('offline')

    setOnline(true)
    await service.flushPending()
    expect(adapter.docs.size).toBe(1)
    expect(service.getStatus().state).toBe('synced')
  })

  it('reports sync errors without losing the local copy', async () => {
    const { service, adapter, repo } = makeService()
    const project = createProject('Warung')
    await repo.saveProject(project)
    adapter.failNext = true

    await service.pushNow(project.projectId)
    expect(service.getStatus().state).toBe('error')
    expect(service.getStatus().message).toContain('network down')
    expect(await repo.loadProject(project.projectId)).not.toBeNull()

    await service.pushNow(project.projectId)
    expect(service.getStatus().state).toBe('synced')
  })

  it('rejects malformed projects instead of pushing them', async () => {
    const adapter = new FakeAdapter()
    const repo = new LocalProjectRepository(window.localStorage)
    const brokenRepo = {
      listProjects: () => repo.listProjects(),
      loadProject: () => Promise.resolve({ tables: 'not-an-array' } as unknown as ErdProject),
      saveProject: () => repo.saveProject(createProject('x')),
      deleteProject: () => Promise.resolve()
    }
    const service = new ProjectSyncService({
      adapter,
      repo: brokenRepo,
      getUid: () => 'user-1',
      isOnline: () => true
    })

    await service.pushNow('p1')
    expect(adapter.docs.size).toBe(0)
    expect(service.getStatus().state).toBe('error')
    expect(service.getStatus().message).toContain('validation')
  })
})

describe('ProjectSyncService.pullAndMerge', () => {
  it('imports remote projects that do not exist locally', async () => {
    const { service, adapter, repo } = makeService()
    const remoteErd = createProject('From cloud')
    adapter.docs.set(remoteErd.projectId, {
      projectId: remoteErd.projectId,
      ownerUid: 'user-1',
      name: 'From cloud',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      erd: remoteErd
    })

    const report = await service.pullAndMerge()
    expect(report.imported).toBe(1)
    const local = await repo.loadProject(remoteErd.projectId)
    expect(local?.name).toBe('From cloud')
  })

  it('never overwrites a locally newer project (last-write-wins)', async () => {
    const { service, adapter, repo } = makeService()
    const local = createProject('Local newer')
    await repo.saveProject(local) // index updatedAt = now

    adapter.docs.set(local.projectId, {
      projectId: local.projectId,
      ownerUid: 'user-1',
      name: 'Stale remote',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-02T00:00:00.000Z',
      erd: { ...local, name: 'Stale remote' }
    })

    const report = await service.pullAndMerge()
    expect(report.skippedLocalNewer).toBe(1)
    expect(report.imported).toBe(0)
    expect((await repo.loadProject(local.projectId))?.name).toBe('Local newer')
  })

  it('skips malformed remote documents', async () => {
    const { service, adapter, repo } = makeService()
    const good = createProject('Good')
    adapter.docs.set(good.projectId, {
      projectId: good.projectId,
      ownerUid: 'user-1',
      name: 'Good',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      erd: good
    })
    adapter.docs.set('bad-1', {
      projectId: 'bad-1',
      ownerUid: 'user-1',
      name: 'Bad',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      // Simulates a document that bypassed adapter-level validation.
      erd: { schemaVersion: 99, tables: 3 } as unknown as ErdProject
    })

    const report = await service.pullAndMerge()
    expect(report.imported).toBe(1)
    expect(report.malformed).toBe(1)
    expect(await repo.loadProject('bad-1')).toBeNull()
  })

  it('does nothing when signed out', async () => {
    const { service, adapter, setUid } = makeService()
    setUid(null)
    const report = await service.pullAndMerge()
    expect(report.imported).toBe(0)
    expect(adapter.pullCalls).toBe(0)
  })
})

describe('ProjectSyncService.deleteRemote', () => {
  it('removes the remote document and cancels queued pushes', async () => {
    const { service, adapter, repo } = makeService()
    const project = createProject('Doomed')
    await repo.saveProject(project)
    await service.pushNow(project.projectId)
    expect(adapter.docs.size).toBe(1)

    service.schedulePush(project.projectId)
    await service.deleteRemote(project.projectId)
    expect(adapter.docs.size).toBe(0)

    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS * 3)
    await vi.runAllTimersAsync()
    expect(adapter.docs.size).toBe(0)
  })
})

describe('NoopProjectSyncService', () => {
  it('returns a referentially stable status snapshot', async () => {
    const { NoopProjectSyncService } = await import('./projectSync')
    const noop = new NoopProjectSyncService()
    // useSyncExternalStore requires getSnapshot to be stable across calls.
    expect(noop.getStatus()).toBe(noop.getStatus())
    expect(noop.subscribe()).toBe(noop.subscribe())
  })
})
