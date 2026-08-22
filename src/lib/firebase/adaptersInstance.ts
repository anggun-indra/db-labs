import { createFirestoreAdapters } from './cloudAdapter'

let adapters: ReturnType<typeof createFirestoreAdapters> | undefined

/** Cached Firestore adapters; null in local mode. */
export function getCloudAdapters() {
  if (adapters === undefined) {
    adapters = createFirestoreAdapters()
  }
  return adapters
}

export function resetCloudAdaptersForTests(): void {
  adapters = undefined
}
