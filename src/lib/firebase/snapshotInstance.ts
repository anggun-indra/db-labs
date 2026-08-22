import { createSnapshotAdapter } from '@/lib/firebase/snapshotAdapter'
import { useAuthStore } from '@/stores/authStore'
import {
  NoopSnapshotService,
  SnapshotService,
  type AnySnapshotService
} from '@/features/snapshots/snapshotService'

let instance: AnySnapshotService | null = null

export function getSnapshotService(): AnySnapshotService {
  if (instance) return instance
  const adapter = createSnapshotAdapter()
  if (!adapter) {
    instance = new NoopSnapshotService()
    return instance
  }
  instance = new SnapshotService({
    adapter,
    getUid: () => useAuthStore.getState().user?.uid ?? null
  })
  return instance
}

export function resetSnapshotServiceForTests(): void {
  instance = null
}
