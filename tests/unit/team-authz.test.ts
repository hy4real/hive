import { describe, expect, test } from 'vitest'

import {
  commandAllowedForKind,
  requireCommandForKind,
  type TeamCommand,
} from '../../src/server/team-authz.js'
import type { AgentKind, AgentSummary } from '../../src/shared/types.js'

const commands: TeamCommand[] = ['send', 'list', 'cancel', 'report', 'status', 'help']

const allowedByKind: Record<AgentKind, TeamCommand[]> = {
  orchestrator: ['send', 'list', 'cancel', 'help'],
  member: ['report', 'status', 'help'],
}

const agent = (overrides: Partial<AgentSummary>): AgentSummary => ({
  id: 'agent-1',
  workspaceId: 'ws-1',
  kind: 'member',
  name: 'Alice',
  description: 'Worker',
  role: 'coder',
  status: 'idle',
  pendingTaskCount: 0,
  ...overrides,
})

describe('team authz by agent kind', () => {
  test.each([
    'orchestrator',
    'member',
  ] as AgentKind[])('%s command matrix is keyed by kind', (kind) => {
    for (const command of commands) {
      expect(commandAllowedForKind(kind, command)).toBe(allowedByKind[kind].includes(command))
    }
  })

  test.each(['send', 'cancel', 'list'] as TeamCommand[])('member cannot run team %s', (command) => {
    const error = (() => {
      try {
        requireCommandForKind(agent({ kind: 'member' }), command)
        return null
      } catch (caught) {
        return caught
      }
    })()

    expect(error).toMatchObject({ statusCode: 403 })
  })

  test('kind wins over role when authorizing commands', () => {
    const memberWithOrchestratorTemplate = agent({
      kind: 'member',
      role: 'orchestrator',
    })
    const orchestratorWithWorkerTemplate = agent({
      kind: 'orchestrator',
      role: 'coder',
    })

    expect(commandAllowedForKind(memberWithOrchestratorTemplate.kind, 'send')).toBe(false)
    expect(requireCommandForKind(memberWithOrchestratorTemplate, 'report')).toBeUndefined()
    expect(commandAllowedForKind(orchestratorWithWorkerTemplate.kind, 'send')).toBe(true)
    expect(requireCommandForKind(orchestratorWithWorkerTemplate, 'send')).toBeUndefined()
  })
})
