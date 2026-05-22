import { describe, expect, test } from 'vitest'
import type { AgentStatus, AgentSummary, TeamListItem } from '../../src/shared/types.js'
import { agentStatuses } from '../../src/shared/types.js'

describe('shared types contract', () => {
  test('shared types module exports runtime contract markers', () => {
    expect(agentStatuses).toEqual(['idle', 'working', 'stopped'])
  })

  test('team list item status uses three-state model', () => {
    const item: TeamListItem = {
      id: 'alice',
      kind: 'member',
      name: 'Alice',
      role: 'coder',
      status: 'working' satisfies AgentStatus,
      pendingTaskCount: 1,
    }

    expect(item.status).toBe('working')
    expect(item.pendingTaskCount).toBe(1)
  })

  test('AgentSummary carries agent kind separately from template role', () => {
    const orchestrator: AgentSummary = {
      id: 'ws-1:orchestrator',
      workspaceId: 'ws-1',
      kind: 'orchestrator',
      name: 'Orchestrator',
      description: 'Coordinates workers',
      role: 'orchestrator',
      status: 'idle',
      pendingTaskCount: 0,
    }
    const worker: AgentSummary = {
      id: 'worker-1',
      workspaceId: 'ws-1',
      kind: 'member',
      name: 'Alice',
      description: 'Implements tasks',
      role: 'coder',
      status: 'idle',
      pendingTaskCount: 0,
    }

    expect(orchestrator.kind).toBe('orchestrator')
    expect(worker.kind).toBe('member')
  })
})
