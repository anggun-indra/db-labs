import { createSubmissionAdapter } from '@/lib/firebase/submissionAdapter'
import { getSnapshotService } from '@/lib/firebase/snapshotInstance'
import { useAuthStore } from '@/stores/authStore'
import { useProjectDbStore } from '@/stores/projectDbStore'
import {
  NoopSubmissionService,
  SubmissionService,
  type AnySubmissionService
} from '@/features/submissions/submissionService'

let instance: AnySubmissionService | null = null

export function getSubmissionService(): AnySubmissionService {
  if (instance) return instance
  const adapter = createSubmissionAdapter()
  if (!adapter) {
    instance = new NoopSubmissionService()
    return instance
  }
  instance = new SubmissionService({
    adapter,
    snapshotService: getSnapshotService(),
    getUid: () => useAuthStore.getState().user?.uid ?? null,
    getRole: () => useAuthStore.getState().user?.role ?? null,
    exportProjectBytes: async (projectId) => {
      let state = useProjectDbStore.getState()
      if (state.projectId !== projectId || state.status !== 'open') {
        await state.openFor(projectId)
        state = useProjectDbStore.getState()
      }
      if (state.status !== 'open') return null
      return state.exportBytes()
    }
  })
  return instance
}

export function resetSubmissionServiceForTests(): void {
  instance = null
}
