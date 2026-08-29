import { create } from 'zustand'

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function detectIsMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isSmallScreen = window.innerWidth <= 768
  return isMobileUA || isSmallScreen
}

export function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

interface PwaState {
  isDesktop: boolean
  isStandalone: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  needRefresh: boolean
  offlineReady: boolean
  updateCallback: (() => Promise<void>) | null
  devBypassGate: boolean

  // Actions
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void
  setNeedRefresh: (needRefresh: boolean, updateCb?: () => Promise<void>) => void
  setOfflineReady: (offlineReady: boolean) => void
  refreshDisplayMode: () => void
  promptInstall: () => Promise<boolean>
  updateApp: () => Promise<void>
  setDevBypassGate: (bypass: boolean) => void
}

export const usePwaStore = create<PwaState>((set, get) => ({
  isDesktop: !detectIsMobile(),
  isStandalone: detectIsStandalone(),
  deferredPrompt: null,
  needRefresh: false,
  offlineReady: false,
  updateCallback: null,
  devBypassGate: false,

  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
  setNeedRefresh: (needRefresh, updateCb) =>
    set({
      needRefresh,
      updateCallback: updateCb || null
    }),
  setOfflineReady: (offlineReady) => set({ offlineReady }),

  refreshDisplayMode: () => {
    set({
      isDesktop: !detectIsMobile(),
      isStandalone: detectIsStandalone()
    })
  },

  promptInstall: async () => {
    const { deferredPrompt } = get()
    if (!deferredPrompt) return false
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        set({ deferredPrompt: null })
        return true
      }
      return false
    } catch (err) {
      console.warn('[pwa] Install prompt failed:', err)
      return false
    }
  },

  updateApp: async () => {
    const { updateCallback } = get()
    if (updateCallback) {
      await updateCallback()
    } else {
      window.location.reload()
    }
  },

  setDevBypassGate: (bypass) => set({ devBypassGate: bypass })
}))

/**
 * Initializes global browser event listeners for PWA install and display-mode changes.
 */
export function initPwaListeners(): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault()
    usePwaStore.getState().setDeferredPrompt(e as BeforeInstallPromptEvent)
  }

  const handleAppInstalled = () => {
    usePwaStore.getState().setDeferredPrompt(null)
    usePwaStore.getState().refreshDisplayMode()
  }

  const handleResize = () => {
    usePwaStore.getState().refreshDisplayMode()
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  window.addEventListener('resize', handleResize)

  // Listen to standalone media query changes
  const mediaQuery = window.matchMedia('(display-mode: standalone)')
  const handleMediaChange = () => {
    usePwaStore.getState().refreshDisplayMode()
  }
  mediaQuery.addEventListener?.('change', handleMediaChange)

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
    window.removeEventListener('resize', handleResize)
    mediaQuery.removeEventListener?.('change', handleMediaChange)
  }
}
