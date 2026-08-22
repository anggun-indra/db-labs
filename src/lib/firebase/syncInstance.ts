import { projectRepository } from '@/lib/persistence/localProjectRepository'
import { getCloudAdapters } from './adaptersInstance'
import { useAuthStore } from '@/stores/authStore'
import {
  NoopProjectSyncService,
  ProjectSyncService,
  type AnyProjectSync
} from './projectSync'

/**
 * Singleton project sync. Local mode returns a no-op service so call sites
 * (editor autosave, project list, deletion) stay unconditional.
 */

let instance: AnyProjectSync | null = null
let listenersInstalled = false

export function getProjectSync(): AnyProjectSync {
  if (instance) return instance

  const adapters = getCloudAdapters()
  if (!adapters) {
    instance = new NoopProjectSyncService()
    return instance
  }

  instance = new ProjectSyncService({
    adapter: adapters.projects,
    repo: projectRepository,
    getUid: () => useAuthStore.getState().user?.uid ?? null,
    isOnline: () => useAuthStore.getState().online
  })

  // Retry queued writes when connectivity returns.
  if (!listenersInstalled && typeof window !== 'undefined') {
    listenersInstalled = true
    window.addEventListener('online', () => {
      void getProjectSync().flushPending()
    })
  }

  return instance
}

export function resetProjectSyncForTests(): void {
  if (instance) instance.dispose()
  instance = null
}
