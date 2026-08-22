import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { installMemoryLocalStorage } from './memoryStorage'

// Unit/integration tests must behave deterministically no matter what the
// developer's local .env.local contains: Vitest loads .env.local exactly like
// Vite, so a configured Firebase would silently switch the app into cloud
// mode mid-suite. Blank every VITE_FIREBASE_* variable here; the rules suite
// keys off process.env.FIRESTORE_EMULATOR_HOST instead, so it is unaffected.
{
  const env = import.meta.env as unknown as Record<string, unknown>
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITE_FIREBASE_') || key.startsWith('VITE_FIRESTORE_')) {
      env[key] = ''
    }
  }
}

// Node 25's inert experimental localStorage shadows jsdom's; replace it with a
// deterministic in-memory implementation BEFORE app modules are imported.
// Node-environment test files (e.g. the SQLite runtime) have no window.
if (typeof window !== 'undefined') {
  installMemoryLocalStorage()
}

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
  if (typeof window === 'undefined') return
  cleanup()
  window.localStorage.clear()
})
