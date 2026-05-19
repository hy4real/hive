// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { TeamListItem, WorkspaceSummary } from '../../src/shared/types.js'
import type { TerminalRunSummary } from '../../web/src/api.js'
import { startWorkspaceShell } from '../../web/src/api.js'
import { NotificationProvider } from '../../web/src/notifications/NotificationProvider.js'
import { ToastProvider } from '../../web/src/ui/useToast.js'
import { WorkspaceDetail } from '../../web/src/WorkspaceDetail.js'

vi.mock('../../web/src/api.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../web/src/api.js')>('../../web/src/api.js')
  return {
    ...actual,
    closeWorkspaceShell: vi.fn(() => Promise.resolve()),
    renameWorker: vi.fn(() => Promise.resolve()),
    startWorkspaceShell: vi.fn(),
  }
})

const workspace: WorkspaceSummary = {
  id: 'ws-1',
  name: 'Alpha',
  path: '/tmp/alpha',
}

const worker: TeamListItem = {
  id: 'worker-1',
  name: 'Alice',
  pendingTaskCount: 0,
  role: 'coder',
  status: 'idle',
}

const shellRun = (runId = 'shell-run-1'): TerminalRunSummary => ({
  agent_id: `${workspace.id}:shell`,
  agent_name: 'Shell 1',
  run_id: runId,
  status: 'running',
})

const workerRun = (): TerminalRunSummary => ({
  agent_id: worker.id,
  agent_name: worker.name,
  run_id: 'worker-run-1',
  status: 'running',
})

const renderWorkspaceDetail = (terminalRuns: TerminalRunSummary[] = []) =>
  render(
    <ToastProvider>
      <NotificationProvider>
        <WorkspaceDetail
          onCreateWorker={vi.fn()}
          onDeleteWorker={vi.fn()}
          onDeleteWorkspace={vi.fn()}
          onStartWorker={vi.fn()}
          onOrchestratorResult={vi.fn()}
          onRequestAddWorkspace={vi.fn()}
          orchestratorAutostartError={null}
          orchestratorAutostartRunId={null}
          terminalRuns={terminalRuns}
          workers={[worker]}
          workspace={workspace}
        />
      </NotificationProvider>
    </ToastProvider>
  )

beforeEach(() => {
  window.localStorage.clear()
  vi.mocked(startWorkspaceShell).mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('WorkspaceDetail shell terminal button', () => {
  test('starts a workspace shell when there is no shell tab or shell run', async () => {
    vi.mocked(startWorkspaceShell).mockResolvedValue(shellRun())

    renderWorkspaceDetail()
    fireEvent.click(screen.getByTestId('open-workspace-shell'))

    expect(startWorkspaceShell).toHaveBeenCalledTimes(1)
    expect(startWorkspaceShell).toHaveBeenCalledWith(workspace.id)
  })

  test('focuses an existing shell tab without starting another shell', async () => {
    const shell = shellRun()
    window.localStorage.setItem(
      `hive.terminal-panel.tabs.${workspace.id}`,
      JSON.stringify([`worker:${worker.id}`, `shell:${shell.run_id}`])
    )
    window.localStorage.setItem(`hive.terminal-panel.active.${workspace.id}`, `worker:${worker.id}`)

    renderWorkspaceDetail([workerRun(), shell])
    const panel = await screen.findByTestId('terminal-bottom-panel')
    expect(within(panel).getByTestId(`terminal-panel-slot-worker-${worker.id}`)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('open-workspace-shell'))

    await waitFor(() => {
      expect(
        within(panel).getByTestId(`terminal-panel-slot-shell-${shell.run_id}`)
      ).toBeInTheDocument()
    })
    expect(startWorkspaceShell).not.toHaveBeenCalled()
  })

  test('does not start more than one workspace shell while a start is in flight', () => {
    vi.mocked(startWorkspaceShell).mockReturnValue(new Promise(() => {}))

    renderWorkspaceDetail()
    const terminalButton = screen.getByTestId('open-workspace-shell')
    fireEvent.click(terminalButton)
    fireEvent.click(terminalButton)

    expect(startWorkspaceShell).toHaveBeenCalledTimes(1)
  })
})
