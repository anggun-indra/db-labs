import { describe, expect, it, beforeEach, vi } from 'vitest'

/**
 * themeStore behaviour: mode persistence, dark attribute application,
 * and system-mode resolution. The store reads localStorage at module load,
 * so tests drive it through the exported helpers + store API.
 */

const DARK_ATTR = 'data-ds-dark-theme'

async function freshStore() {
  vi.resetModules()
  return import('@/stores/themeStore')
}

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.removeAttribute(DARK_ATTR)
    vi.restoreAllMocks()
  })

  it('defaults to system mode and applies the resolved attribute', async () => {
    const { useThemeStore } = await freshStore()
    const state = useThemeStore.getState()
    expect(state.mode).toBe('system')
    // jsdom has no matchMedia → system resolves to light
    expect(state.isDark).toBe(false)
    expect(document.body.hasAttribute(DARK_ATTR)).toBe(false)
  })

  it('persists the chosen mode and toggles the dark attribute', async () => {
    const { useThemeStore, THEME_STORAGE_KEY } = await freshStore()
    useThemeStore.getState().setMode('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.body.getAttribute(DARK_ATTR)).toBe('true')
    expect(useThemeStore.getState().isDark).toBe(true)

    useThemeStore.getState().setMode('light')
    expect(document.body.hasAttribute(DARK_ATTR)).toBe(false)
    expect(useThemeStore.getState().isDark).toBe(false)
  })

  it('restores the stored mode on load', async () => {
    localStorage.setItem('dblab:ui-theme', 'dark')
    const { useThemeStore } = await freshStore()
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(useThemeStore.getState().isDark).toBe(true)
    expect(document.body.getAttribute(DARK_ATTR)).toBe('true')
  })

  it('ignores invalid stored values', async () => {
    localStorage.setItem('dblab:ui-theme', 'neon')
    const { useThemeStore } = await freshStore()
    expect(useThemeStore.getState().mode).toBe('system')
  })

  it('syncWithSystem is a no-op outside system mode', async () => {
    const { useThemeStore } = await freshStore()
    useThemeStore.getState().setMode('dark')
    useThemeStore.getState().syncWithSystem()
    expect(useThemeStore.getState().isDark).toBe(true)
  })
})
