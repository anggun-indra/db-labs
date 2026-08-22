/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DBLab',
        short_name: 'DB Lab',
        description:
          'Learn database management hands-on: design ERDs, generate SQLite databases and practice SQL right in your browser.',
        theme_color: '#1f3a5f',
        background_color: '#f5f7fa',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Cache the application shell; do NOT aggressively cache Firestore/API
        // responses (spec §30). Firebase SDK manages its own network behavior.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm}'],
        // The TypeScript language worker ships with the full monaco-editor
        // entry but is never used for SQL; keep it out of the precache.
        globIgnores: ['**/ts.worker*.js'],
        // Monaco is a single large vendor chunk; precache it so the SQL
        // Playground also works offline (Phase 3).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors so app-shell updates do not invalidate them
        // (also keeps each precached PWA chunk smaller, spec §30).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('monaco-editor')) return 'vendor-monaco'
          if (id.includes('sql.js')) return 'vendor-sqljs'
          if (id.includes('antd') || id.includes('@ant-design')) return 'antd'
          if (id.includes('@xyflow')) return 'xyflow'
          if (id.includes('firebase')) return 'firebase'
          return undefined
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}']
  }
})
