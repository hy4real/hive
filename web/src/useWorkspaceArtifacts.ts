import { useEffect, useState } from 'react'

import type { WorkspaceArtifact } from '../../src/shared/types.js'
import { listWorkspaceArtifacts } from './api.js'

const REFRESH_INTERVAL_MS = 2000
const MAX_REFRESH_INTERVAL_MS = 10000

const getRefreshDelay = (failureCount: number) =>
  Math.min(REFRESH_INTERVAL_MS * 2 ** failureCount, MAX_REFRESH_INTERVAL_MS)

const areArtifactsEqual = (a: WorkspaceArtifact[], b: WorkspaceArtifact[]): boolean => {
  if (a.length !== b.length) return false
  return a.every((item, index) => {
    const other = b[index]
    return (
      other !== undefined &&
      item.worker_id === other.worker_id &&
      item.created_at === other.created_at &&
      item.type === other.type &&
      item.text === other.text &&
      item.artifacts.length === other.artifacts.length &&
      item.artifacts.every((path, i) => path === other.artifacts[i])
    )
  })
}

export const useWorkspaceArtifacts = (workspaceId: string | null) => {
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([])

  useEffect(() => {
    if (!workspaceId) {
      setArtifacts([])
      return
    }
    let cancelled = false
    let inFlight = false
    let failureCount = 0
    let timeout: number | undefined

    const scheduleNextLoad = () => {
      if (!cancelled) timeout = window.setTimeout(loadArtifacts, getRefreshDelay(failureCount))
    }

    const loadArtifacts = () => {
      if (inFlight) return
      inFlight = true
      void listWorkspaceArtifacts(workspaceId)
        .then((result) => {
          if (cancelled) return
          failureCount = 0
          setArtifacts((current) => (areArtifactsEqual(current, result) ? current : result))
        })
        .catch((error) => {
          console.error('[hive] swallowed:artifacts.fetch', error)
          failureCount = Math.min(failureCount + 1, 4)
        })
        .finally(() => {
          inFlight = false
          scheduleNextLoad()
        })
    }

    loadArtifacts()
    return () => {
      cancelled = true
      if (timeout !== undefined) window.clearTimeout(timeout)
    }
  }, [workspaceId])

  return artifacts
}
