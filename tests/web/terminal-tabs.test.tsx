// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { TerminalTabs } from '../../web/src/terminal/TerminalTabs.js'
import type { TerminalTab } from '../../web/src/terminal/useTerminalPanelTabs.js'

afterEach(() => cleanup())

const buildWorkerTab = (overrides: Partial<TerminalTab> = {}): TerminalTab =>
  ({
    id: 'worker:w1',
    kind: 'worker',
    workerId: 'w1',
    runId: 'run-1',
    label: 'Alice',
    ...overrides,
  }) as TerminalTab

const buildShellTab = (overrides: Partial<TerminalTab> = {}): TerminalTab =>
  ({
    id: 'shell:run-x',
    kind: 'shell',
    runId: 'run-x',
    label: 'shell',
    ...overrides,
  }) as TerminalTab

describe('TerminalTabs', () => {
  test('renders a vertical side rail instead of a horizontal tab strip', () => {
    render(
      <TerminalTabs
        tabs={[buildWorkerTab(), buildShellTab()]}
        activeId="worker:w1"
        onSelect={vi.fn()}
        onNewShell={vi.fn()}
        newShellPending={false}
      />
    )
    expect(screen.queryByTestId('terminal-tab-strip')).toBeNull()
    expect(screen.getByTestId('terminal-side-rail')).toBeInTheDocument()
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical')
  })

  test('clicking a rail tab fires onSelect with its id', () => {
    const onSelect = vi.fn()
    render(
      <TerminalTabs
        tabs={[buildWorkerTab(), buildShellTab()]}
        activeId="worker:w1"
        onSelect={onSelect}
        onNewShell={vi.fn()}
        newShellPending={false}
      />
    )
    fireEvent.click(screen.getByTestId('terminal-tab-shell:run-x'))
    expect(onSelect).toHaveBeenCalledWith('shell:run-x')
  })

  test('new-shell button fires onNewShell', () => {
    const onNewShell = vi.fn()
    render(
      <TerminalTabs
        tabs={[]}
        activeId={null}
        onSelect={vi.fn()}
        onNewShell={onNewShell}
        newShellPending={false}
      />
    )
    fireEvent.click(screen.getByTestId('terminal-tab-new-shell'))
    expect(onNewShell).toHaveBeenCalledTimes(1)
  })

  test('active tab marks aria-selected and exposes the active accent rail', () => {
    render(
      <TerminalTabs
        tabs={[buildWorkerTab(), buildShellTab()]}
        activeId="shell:run-x"
        onSelect={vi.fn()}
        onNewShell={vi.fn()}
        newShellPending={false}
      />
    )
    expect(screen.getByTestId('terminal-tab-worker:w1').getAttribute('aria-selected')).toBe('false')
    const active = screen.getByTestId('terminal-tab-shell:run-x')
    expect(active.getAttribute('aria-selected')).toBe('true')
    expect(active.querySelector('[data-tab-accent]')).not.toBeNull()
  })

  test('rail tab is a single button without nested button controls', () => {
    render(
      <TerminalTabs
        tabs={[buildWorkerTab()]}
        activeId="worker:w1"
        onSelect={vi.fn()}
        onNewShell={vi.fn()}
        newShellPending={false}
      />
    )
    const tab = screen.getByTestId('terminal-tab-worker:w1')
    expect(tab.tagName).toBe('BUTTON')
    expect(tab.querySelector('button')).toBeNull()
  })
})
