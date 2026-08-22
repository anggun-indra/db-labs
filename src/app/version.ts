declare const __APP_VERSION__: string

/**
 * Build-time application version, injected from package.json via the Vite
 * `define` in vite.config.ts. `npm run deploy` bumps the patch number before
 * building, so every deployment ships a fresh version tag.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '0.0.0-dev'
