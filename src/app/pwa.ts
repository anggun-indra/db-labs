import { usePwaStore } from '@/stores/pwaStore'

let globalRegistration: ServiceWorkerRegistration | null = null
let globalUpdateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

/**
 * PWA service-worker registration (spec §30).
 *
 * Listens for new deployments on Firebase. When a new version is detected,
 * sets `needRefresh = true` in the PWA store to trigger the Force Update prompt.
 */
export function registerServiceWorker(): void {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.info('[pwa] New version detected on server. Force update triggered.')
          usePwaStore.getState().setNeedRefresh(true, async () => {
            await updateSW(true)
          })
        },
        onOfflineReady() {
          usePwaStore.getState().setOfflineReady(true)
          console.info('[pwa] DBLab is ready to work offline.')
        },
        onRegisteredSW(_swUrl, registration) {
          if (registration) {
            globalRegistration = registration
            // Check for updates every 2 minutes while the user is active
            setInterval(() => {
              void registration.update()
            }, 2 * 60 * 1000)

            // Also check for updates whenever the window regains focus
            window.addEventListener('focus', () => {
              void registration.update()
            })
          }
        }
      })
      globalUpdateSW = updateSW
    })
    .catch((error) => {
      console.warn('[pwa] Service worker registration skipped:', error)
    })
}

/**
 * Manually checks if a new version is available on the Firebase server.
 */
export async function checkForAppUpdates(): Promise<{ hasUpdate: boolean }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { hasUpdate: false }
  }

  try {
    if (globalRegistration) {
      await globalRegistration.update()
      if (globalRegistration.waiting || usePwaStore.getState().needRefresh) {
        return { hasUpdate: true }
      }
    } else {
      const regs = await navigator.serviceWorker.getRegistrations()
      if (regs.length > 0) {
        globalRegistration = regs[0]
        await regs[0].update()
        if (regs[0].waiting || usePwaStore.getState().needRefresh) {
          return { hasUpdate: true }
        }
      }
    }
  } catch (err) {
    console.warn('[pwa] Check update error:', err)
  }

  return { hasUpdate: usePwaStore.getState().needRefresh }
}

/**
 * Forces an immediate application reload with the latest service worker cache.
 */
export async function forceAppUpdate(): Promise<void> {
  try {
    if (globalUpdateSW) {
      await globalUpdateSW(true)
    } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.update()))
      window.location.reload()
    } else {
      window.location.reload()
    }
  } catch {
    window.location.reload()
  }
}
