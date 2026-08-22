/**
 * PWA service-worker registration (spec §30).
 *
 * Uses the "prompt" strategy: when a new version is deployed the user is
 * asked to reload instead of being swapped mid-session (which could destroy
 * unsaved ERD work). Firestore/API traffic is NOT cached by the service
 * worker; the Firebase SDK manages its own behavior.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return

  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          // Keep dependency-free for Phase 0; a friendlier AntD modal can
          // replace confirm() once the notification center exists.
          if (window.confirm('A new version of Database Learning Lab is available. Reload?')) {
            window.location.reload()
          }
        },
        onOfflineReady() {
          console.info('[pwa] Database Learning Lab is ready to work offline.')
        }
      })
    })
    .catch((error) => {
      console.warn('[pwa] Service worker registration skipped:', error)
    })
}
