import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Button, Result, Space } from 'antd'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Route-level error boundary (Phase 8). Any rendering crash is contained
 * with a clear recovery UI instead of a blank page; local data is never
 * lost because the boundary only affects rendering, not storage.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[error-boundary]', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div style={{ padding: 24 }}>
        <Result
          status="error"
          title="Something went wrong"
          subTitle="The page hit an unexpected error. Your locally saved projects and drafts are safe."
          extra={
            <Space>
              <Button type="primary" onClick={this.handleReload} data-testid="boundary-reload">
                Reload page
              </Button>
              <Button onClick={this.handleReset} data-testid="boundary-retry">
                Try again
              </Button>
            </Space>
          }
        >
          <Alert
            type="error"
            message="Error details"
            description={this.state.error.message}
            data-testid="boundary-details"
          />
        </Result>
      </div>
    )
  }
}

export function UnsupportedBrowserNotice() {
  return (
    <div style={{ padding: 24 }} data-testid="unsupported-browser">
      <Result
        status="warning"
        title="Browser not supported"
        subTitle="DBLab runs SQLite inside your browser via WebAssembly. Please use a current version of Chrome, Edge, Firefox or Safari — your data never leaves the device."
      />
    </div>
  )
}
