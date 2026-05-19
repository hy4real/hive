// @vitest-environment jsdom

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { WorkspaceSummary } from '../../src/shared/types.js'
import type { TerminalRunSummary } from '../../web/src/api.js'

vi.mock('../../web/src/AppWorkspaceContent.js', () => ({
  AppWorkspaceContent: ({
    activeId,
    onShellRunStarted,
    optimisticRunsByWorkspaceId,
  }: {
    activeId?: string
    onShellRunStarted: (workspaceId: string, run: TerminalRunSummary) => void
    optimisticRunsByWorkspaceId: Record<string, TerminalRunSummary[]>
  }) => {
    const run: TerminalRunSummary | null = activeId
      ? {
          agent_id: `${activeId}:shell`,
          agent_name: 'Shell 1',
          run_id: 'run-shell-1',
          status: 'running',
        }
      : null

    return (
      <>
        <button
          type="button"
          data-testid="emit-shell-run"
          disabled={!activeId || !run}
          onClick={() => {
            if (activeId && run) onShellRunStarted(activeId, run)
          }}
        >
          emit shell
        </button>
        <output data-testid="optimistic-runs">{JSON.stringify(optimisticRunsByWorkspaceId)}</output>
      </>
    )
  },
}))

const nativeFetch = globalThis.fetch
const tempDirs: string[] = []

let cleanupServer: (() => Promise<void>) | undefined
let cookie = ''
let workspacePath = ''

const createWorkspace = async (baseUrl: string) => {
  const response = await nativeFetch(`${baseUrl}/api/workspaces`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      autostart_orchestrator: false,
      name: 'Alpha',
      path: workspacePath,
    }),
  })
  expect(response.status).toBe(201)
  return (await response.json()) as WorkspaceSummary
}

beforeEach(async () => {
  window.localStorage.removeItem?.('hive.workspace-sidebar.width')
  window.localStorage.setItem('hive.first-run-seen', '1')
  workspacePath = mkdtempSync(join(tmpdir(), 'hive-app-shell-optimistic-'))
  mkdirSync(workspacePath, { recursive: true })
  tempDirs.push(workspacePath)
  process.env.HIVE_FS_BROWSE_ROOT = workspacePath

  const { startTestServer } = await import('../helpers/test-server.js')
  const server = await startTestServer({ pickFolderPath: workspacePath })
  cleanupServer = server.close
  await nativeFetch(`${server.baseUrl}/api/ui/session`).then((response) => {
    cookie = response.headers.get('set-cookie') ?? ''
  })
  await createWorkspace(server.baseUrl)

  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const value =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const url = value.startsWith('http') ? value : `${server.baseUrl}${value}`
    const headers = new Headers(init?.headers)
    headers.set('cookie', cookie)
    return nativeFetch(url, { ...init, headers })
  })
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await cleanupServer?.()
  cleanupServer = undefined
  delete process.env.HIVE_FS_BROWSE_ROOT
  cookie = ''
  for (const dir of tempDirs.splice(0)) rmSync(dir, { force: true, recursive: true })
})

describe('app shell optimistic run wiring', () => {
  test('records shell runs emitted by workspace content as optimistic terminal runs', async () => {
    const { App } = await import('../../web/src/app.js')

    render(<App />)

    const emitButton = await screen.findByTestId('emit-shell-run')
    await waitFor(() => expect(emitButton).toBeEnabled())

    fireEvent.click(emitButton)

    await waitFor(() => {
      expect(screen.getByTestId('optimistic-runs')).toHaveTextContent('run-shell-1')
    })
    expect(screen.getByTestId('optimistic-runs')).toHaveTextContent('"agent_name":"Shell 1"')
    expect(screen.getByTestId('optimistic-runs')).toHaveTextContent('"status":"running"')
  })
})
