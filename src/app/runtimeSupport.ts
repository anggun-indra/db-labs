/**
 * Runtime capability gate (Phase 8). The app requires WebAssembly (sql.js)
 * and localStorage, so unsupported browsers get a clear explanation
 * instead of a cryptic crash. Cloud features degrade separately via their
 * own feature detection.
 */
export function isRuntimeSupported(): boolean {
  return typeof WebAssembly !== 'undefined' && typeof window.localStorage !== 'undefined'
}
