// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AppErrorBoundary, UnsupportedBrowserNotice } from './ErrorBoundary'
import { isRuntimeSupported } from './runtimeSupport'

/**
 * Phase 8 hardening tests: the route-level error boundary contains crashes
 * with a recovery UI, and the runtime gate explains unsupported browsers.
 */

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom: canvas exploded')
  return <div data-testid="safe-content">all good</div>
}

describe('AppErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <Bomb shouldThrow={false} />
      </AppErrorBoundary>
    )
    expect(screen.getByTestId('safe-content')).toBeDefined()
  })

  it('contains a crash and offers reload + retry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AppErrorBoundary>
        <Bomb shouldThrow={true} />
      </AppErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByTestId('boundary-reload')).toBeDefined()
    expect(screen.getByTestId('boundary-retry')).toBeDefined()
    expect(screen.getByText(/canvas exploded/)).toBeDefined()
    spy.mockRestore()
    cleanup()
  })

  it('retry clears the error state and re-renders children', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true
    function ToggleBomb() {
      if (shouldThrow) throw new Error('first crash')
      return <div data-testid="recovered">recovered</div>
    }
    render(
      <AppErrorBoundary>
        <ToggleBomb />
      </AppErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeDefined()

    shouldThrow = false
    fireEvent.click(screen.getByTestId('boundary-retry'))
    expect(screen.getByTestId('recovered')).toBeDefined()
    spy.mockRestore()
    cleanup()
  })
})

describe('runtime support gate', () => {
  it('detects a supported environment (jsdom provides WebAssembly + storage)', () => {
    expect(isRuntimeSupported()).toBe(true)
  })

  it('renders a friendly notice for unsupported browsers', () => {
    render(<UnsupportedBrowserNotice />)
    expect(screen.getByTestId('unsupported-browser')).toBeDefined()
    expect(screen.getByText(/Browser not supported/)).toBeDefined()
  })
})
