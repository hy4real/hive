import type { AgentSummary } from '../shared/types.js'
import { ForbiddenError, UnauthorizedError } from './http-errors.js'

export type TeamCommand = 'send' | 'list' | 'report' | 'status' | 'cancel' | 'help'

const ORCHESTRATOR_COMMANDS = new Set<TeamCommand>(['send', 'list', 'cancel', 'help'])
const MEMBER_COMMANDS = new Set<TeamCommand>(['report', 'status', 'help'])

export const commandAllowedForKind = (kind: AgentSummary['kind'], command: TeamCommand) => {
  if (kind === 'orchestrator') return ORCHESTRATOR_COMMANDS.has(command)
  if (kind === 'member') return MEMBER_COMMANDS.has(command)
  return false
}

interface AuthenticateInput {
  fromAgentId: string | undefined
  getAgent: (workspaceId: string, agentId: string) => AgentSummary
  token: string | undefined
  validateToken: (agentId: string, token: string | undefined) => boolean
  workspaceId: string
}

export const authenticateCliAgent = ({
  fromAgentId,
  getAgent,
  token,
  validateToken,
  workspaceId,
}: AuthenticateInput): AgentSummary => {
  if (!fromAgentId) {
    throw new UnauthorizedError('Missing agent identity')
  }
  if (!validateToken(fromAgentId, token)) {
    throw new UnauthorizedError('Invalid or missing agent token')
  }
  let agent: AgentSummary
  try {
    agent = getAgent(workspaceId, fromAgentId)
  } catch {
    throw new UnauthorizedError('Agent not found in workspace')
  }
  return agent
}

export const requireCommandForKind = (agent: AgentSummary, command: TeamCommand) => {
  if (!commandAllowedForKind(agent.kind, command)) {
    throw new ForbiddenError(`Agent kind '${agent.kind}' is not allowed to run team ${command}`)
  }
}
