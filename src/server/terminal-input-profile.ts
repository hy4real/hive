import { basename } from 'node:path'

import type { AgentLaunchConfigInput } from './agent-run-store.js'

export type TerminalInputProfile = 'default' | 'opencode' | 'reasonix'

export interface TerminalRunSummary {
  agent_id: string
  agent_name: string
  run_id: string
  status: string
  terminal_input_profile: TerminalInputProfile
}

const normalizeExecutable = (value: string | null | undefined): string | null => {
  if (!value) return null
  const normalized = basename(value).toLowerCase()
  return normalized.replace(/\.(cmd|exe)$/u, '')
}

export const resolveTerminalInputProfile = (
  config: AgentLaunchConfigInput | undefined
): TerminalInputProfile => {
  if (!config) return 'default'
  if (config.commandPresetId === 'opencode') return 'opencode'
  if (config.commandPresetId === 'reasonix') return 'reasonix'

  const executable =
    normalizeExecutable(config.interactiveCommand) ?? normalizeExecutable(config.command)
  if (executable === 'opencode') return 'opencode'
  if (executable === 'reasonix' || executable === 'dsnix') return 'reasonix'
  return 'default'
}
