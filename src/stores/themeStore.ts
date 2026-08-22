import { create } from 'zustand'

/**
 * Appearance state, following the DeepSeek harness convention:
 * mode is light | dark | system, dark mode is applied as the
 * `data-ds-dark-theme` attribute on <body> (the same hook the dsw token
 * layer in src/styles/dsw/tokens.css uses), and the choice persists in
 * localStorage.
 */

export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'dblab:ui-theme'
export const DARK_THEME_ATTR = 'data-ds-dark-theme'

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  return Boolean(query?.matches)
}

function resolveIsDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'system' && systemPrefersDark())
}

function applyDarkAttribute(isDark: boolean): void {
  if (typeof document === 'undefined') return
  if (isDark) document.body.setAttribute(DARK_THEME_ATTR, 'true')
  else document.body.removeAttribute(DARK_THEME_ATTR)
}

export function loadStoredThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // storage unavailable — fall back to system
  }
  return 'system'
}

interface ThemeState {
  mode: ThemeMode
  isDark: boolean
  setMode(mode: ThemeMode): void
  /** React to OS preference changes while in system mode. */
  syncWithSystem(): void
}

const initialMode = loadStoredThemeMode()
const initialIsDark = resolveIsDark(initialMode)
applyDarkAttribute(initialIsDark)

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  isDark: initialIsDark,

  setMode(mode) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // keep working without persistence
    }
    const isDark = resolveIsDark(mode)
    applyDarkAttribute(isDark)
    set({ mode, isDark })
  },

  syncWithSystem() {
    if (get().mode !== 'system') return
    const isDark = resolveIsDark('system')
    applyDarkAttribute(isDark)
    set({ isDark })
  }
}))

let watching = false

/** Start observing OS color-scheme changes (idempotent). */
export function startThemeSystemWatcher(): void {
  if (watching || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  if (!query) return
  watching = true
  const onChange = () => useThemeStore.getState().syncWithSystem()
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange)
  else if (typeof query.addListener === 'function') query.addListener(onChange) // older Safari
}
