import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { installMemoryLocalStorage } from './memoryStorage'

// Node 25's inert experimental localStorage shadows jsdom's; replace it with a
// deterministic in-memory implementation BEFORE app modules are imported.
installMemoryLocalStorage()

// ---- jsdom environment shims required by antd / React Flow ----------------

// antd responsive components call window.matchMedia, which jsdom lacks.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
}

// ResizeObserver is used by antd and React Flow; jsdom does not provide it.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

// React Testing Library auto-cleanup between tests.
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
