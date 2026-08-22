import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import { router } from '@/app/router'
import { registerServiceWorker } from '@/app/pwa'
import { AppErrorBoundary, UnsupportedBrowserNotice } from '@/app/ErrorBoundary'
import { isRuntimeSupported } from '@/app/runtimeSupport'
import { buildDswThemeConfig } from '@/app/dswTheme'
import { startThemeSystemWatcher, useThemeStore } from '@/stores/themeStore'
import 'antd/dist/reset.css'
import '@/styles/dsw/tokens.css'
import '@/styles/global.css'

registerServiceWorker()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

/**
 * DeepSeek-harness-style theming: the dsw token layer keys dark mode off the
 * `data-ds-dark-theme` body attribute (managed by the theme store), and AntD
 * follows with the matching algorithm + token map.
 */
function ThemedApp() {
  const isDark = useThemeStore((s) => s.isDark)

  useEffect(() => {
    startThemeSystemWatcher()
  }, [])

  return (
    <ConfigProvider theme={buildDswThemeConfig(isDark)}>
      <AntApp>
        <AppErrorBoundary>
          {isRuntimeSupported() ? <RouterProvider router={router} /> : <UnsupportedBrowserNotice />}
        </AppErrorBoundary>
      </AntApp>
    </ConfigProvider>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>
)
