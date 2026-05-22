import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { encodeClaudeProjectPath } from './session-capture-claude.js'

const SESSION_FILE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jsonl$/i

const getDefaultPiSessionsRoot = () =>
  process.env.HIVE_PI_SESSIONS_DIR ?? join(homedir(), '.pi', 'agent', 'sessions')

const expandHome = (path: string) =>
  path === '~' || path.startsWith('~/') ? join(homedir(), path.slice(2)) : path

export const getPiSessionsRoot = (pattern?: string) => {
  if (!pattern) return getDefaultPiSessionsRoot()
  const markerIndex = pattern.indexOf('{encoded_cwd}')
  if (markerIndex === -1) return getDefaultPiSessionsRoot()
  const rawRoot = pattern.slice(0, markerIndex).replace(/[\\/]+$/, '')
  if (!rawRoot) return getDefaultPiSessionsRoot()
  if (rawRoot === '~' || rawRoot.startsWith('~/')) return getDefaultPiSessionsRoot()
  return expandHome(rawRoot)
}

const listSessionIds = (cwd: string, sessionsRoot = getDefaultPiSessionsRoot()) => {
  const projectDir = join(sessionsRoot, encodeClaudeProjectPath(cwd))
  try {
    return readdirSync(projectDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && SESSION_FILE.test(entry.name))
      .map((entry) => entry.name.replace(/\.jsonl$/i, ''))
      .sort((left, right) => left.localeCompare(right))
  } catch {
    return []
  }
}

export const hasPiSession = (cwd: string, sessionId: string, pattern?: string) =>
  listSessionIds(cwd, getPiSessionsRoot(pattern)).includes(sessionId)

export const snapshotPiSessionIds = (cwd: string, sessionsRoot = getDefaultPiSessionsRoot()) =>
  new Set(listSessionIds(cwd, sessionsRoot))

export const capturePiSessionId = async (
  cwd: string,
  knownSessionIds: Set<string>,
  onCapture: (sessionId: string) => void,
  timeoutMs = 5000,
  intervalMs = 100,
  sessionsRoot = getDefaultPiSessionsRoot()
) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() <= deadline) {
    const current = listSessionIds(cwd, sessionsRoot)
    for (const id of current) {
      if (!knownSessionIds.has(id)) {
        onCapture(id)
        return
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export const piSessionStoreExists = (sessionsRoot = getDefaultPiSessionsRoot()) =>
  existsSync(sessionsRoot)
