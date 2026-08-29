declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string
declare const __BUILD_HASH__: string

/**
 * Build-time application version and metadata, injected from package.json
 * and build environment via the Vite `define` in vite.config.ts.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '0.1.0-dev'

export const BUILD_TIME: string =
  typeof __BUILD_TIME__ === 'string' && __BUILD_TIME__ ? __BUILD_TIME__ : new Date().toISOString()

export const BUILD_HASH: string =
  typeof __BUILD_HASH__ === 'string' && __BUILD_HASH__ ? __BUILD_HASH__ : 'dev'

/**
 * Formats a user-friendly version string e.g. "v0.1.0 (Build 2026-08-24 20:30)"
 */
export function getFullVersionString(): string {
  const dateStr = BUILD_TIME ? new Date(BUILD_TIME).toLocaleDateString() : ''
  return `v${APP_VERSION}${dateStr ? ` · ${dateStr}` : ''}`
}
