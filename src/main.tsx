import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import { router } from '@/app/router'
import { registerServiceWorker } from '@/app/pwa'
import { AppErrorBoundary, UnsupportedBrowserNotice } from '@/app/ErrorBoundary'
import { isRuntimeSupported } from '@/app/runtimeSupport'
import 'antd/dist/reset.css'
import '@/styles/global.css'

registerServiceWorker()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1f3a5f',
          borderRadius: 6
        }
      }}
    >
      <AntApp>
        <AppErrorBoundary>
          {isRuntimeSupported() ? <RouterProvider router={router} /> : <UnsupportedBrowserNotice />}
        </AppErrorBoundary>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
)
