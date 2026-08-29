import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  usePwaStore,
  detectIsMobile,
  detectIsStandalone,
  initPwaListeners,
  type BeforeInstallPromptEvent
} from './pwaStore'

describe('pwaStore', () => {
  beforeEach(() => {
    usePwaStore.setState({
      isDesktop: true,
      isStandalone: false,
      deferredPrompt: null,
      needRefresh: false,
      offlineReady: false,
      updateCallback: null,
      devBypassGate: false
    })
  })

  describe('detectIsMobile', () => {
    it('detects desktop on wide screen with standard userAgent', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 })
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      })
      expect(detectIsMobile()).toBe(false)
    })

    it('detects mobile on narrow screen <= 768px', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
      expect(detectIsMobile()).toBe(true)
    })

    it('detects mobile on mobile user agent even on wide viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
      })
      expect(detectIsMobile()).toBe(true)
    })
  })

  describe('detectIsStandalone', () => {
    it('returns false in regular browser window', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
      expect(detectIsStandalone()).toBe(false)
    })

    it('returns true when display-mode: standalone matches', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
      expect(detectIsStandalone()).toBe(true)
    })
  })

  describe('usePwaStore actions', () => {
    it('sets deferred prompt and prompts install', async () => {
      const mockPrompt: BeforeInstallPromptEvent = {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
      } as unknown as BeforeInstallPromptEvent

      usePwaStore.getState().setDeferredPrompt(mockPrompt)
      expect(usePwaStore.getState().deferredPrompt).toBe(mockPrompt)

      const result = await usePwaStore.getState().promptInstall()
      expect(result).toBe(true)
      expect(mockPrompt.prompt).toHaveBeenCalled()
      expect(usePwaStore.getState().deferredPrompt).toBeNull()
    })

    it('sets needRefresh and executes updateApp callback', async () => {
      const updateFn = vi.fn().mockResolvedValue(undefined)
      usePwaStore.getState().setNeedRefresh(true, updateFn)

      expect(usePwaStore.getState().needRefresh).toBe(true)
      await usePwaStore.getState().updateApp()
      expect(updateFn).toHaveBeenCalled()
    })

    it('toggles dev bypass gate', () => {
      usePwaStore.getState().setDevBypassGate(true)
      expect(usePwaStore.getState().devBypassGate).toBe(true)
    })
  })

  describe('initPwaListeners', () => {
    it('registers and unregisters window event listeners cleanly', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      const cleanup = initPwaListeners()
      expect(addSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function))

      cleanup()
      expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function))
    })
  })
})
