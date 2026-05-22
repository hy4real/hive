import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const REASONIX_SESSION_FILE = /^(?!.*\.events\.jsonl$).*\.jsonl$/i

const getDefaultReasonixSessionsRoot = () =>
  process.env.HIVE_REASONIX_SESSIONS_DIR ?? join(homedir(), '.reasonix', 'sessions')

const expandHome = (path: string) =>
  path === '~' || path.startsWith('~/') ? join(homedir(), path.slice(2)) : path

export const getReasonixSessionsRoot = (pattern?: string) => {
  if (!pattern) return getDefaultReasonixSessionsRoot()
  const markerIndex = pattern.indexOf('/*.jsonl')
  if (markerIndex === -1) return getDefaultReasonixSessionsRoot()
  const rawRoot = pattern.slice(0, markerIndex).replace(/[\\/]+$/, '')
  if (!rawRoot) return getDefaultReasonixSessionsRoot()
  if (rawRoot === '~' || rawRoot.startsWith('~/')) return getDefaultReasonixSessionsRoot()
  return expandHome(rawRoot)
}

const readMetaWorkspace = (sessionsRoot: string, baseName: string): string | null => {
  try {
    const metaPath = join(sessionsRoot, `${baseName}.meta.json`)
    const raw = readFileSync(metaPath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    return 'workspace' in parsed && typeof parsed.workspace === 'string' ? parsed.workspace : null
  } catch {
    return null
  }
}

const listSessionIds = (cwd: string, sessionsRoot = getDefaultReasonixSessionsRoot()) => {
  try {
    return readdirSync(sessionsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && REASONIX_SESSION_FILE.test(entry.name))
      .flatMap((entry) => {
        const baseName = entry.name.replace(/\.jsonl$/i, '')
        const workspace = readMetaWorkspace(sessionsRoot, baseName)
        return workspace === cwd ? [baseName] : []
      })
      .sort((left, right) => left.localeCompare(right))
  } catch {
    return []
  }
}

export const hasReasonixSession = (cwd: string, sessionId: string, pattern?: string) =>
  listSessionIds(cwd, getReasonixSessionsRoot(pattern)).includes(sessionId)

export const snapshotReasonixSessionIds = (
  cwd: string,
  sessionsRoot = getDefaultReasonixSessionsRoot()
) => new Set(listSessionIds(cwd, sessionsRoot))

export const captureReasonixSessionId = async (
  cwd: string,
  knownSessionIds: Set<string>,
  onCapture: (sessionId: string) => void,
  timeoutMs = 5000,
  intervalMs = 100,
  sessionsRoot = getDefaultReasonixSessionsRoot()
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

export const reasonixSessionStoreExists = (sessionsRoot = getDefaultReasonixSessionsRoot()) =>
  existsSync(sessionsRoot)
