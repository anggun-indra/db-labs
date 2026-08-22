import { createAssignmentAdapter } from '@/lib/firebase/assignmentAdapter'
import { useAuthStore } from '@/stores/authStore'
import {
  AssignmentService,
  NoopAssignmentService,
  type AnyAssignmentService
} from '@/features/assignments/assignmentService'

let instance: AnyAssignmentService | null = null

export function getAssignmentService(): AnyAssignmentService {
  if (instance) return instance
  const adapter = createAssignmentAdapter()
  if (!adapter) {
    instance = new NoopAssignmentService()
    return instance
  }
  instance = new AssignmentService({
    adapter,
    getUid: () => useAuthStore.getState().user?.uid ?? null,
    getRole: () => useAuthStore.getState().user?.role ?? null
  })
  return instance
}

export function resetAssignmentServiceForTests(): void {
  instance = null
}
