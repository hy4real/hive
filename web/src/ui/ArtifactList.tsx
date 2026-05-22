import { FileIcon, ImageIcon } from 'lucide-react'

import { Tooltip } from './Tooltip.js'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'])
const getExtension = (path: string) => {
  const lastDot = path.lastIndexOf('.')
  return lastDot >= 0 ? path.slice(lastDot).toLowerCase() : ''
}
const getFilename = (path: string) => {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? path
}
const isImagePath = (path: string) => IMAGE_EXTENSIONS.has(getExtension(path))

type ArtifactListProps = {
  artifacts: string[]
  className?: string
}

export const ArtifactList = ({ artifacts, className }: ArtifactListProps) => {
  if (artifacts.length === 0) return null

  return (
    <div className={className}>
      {artifacts.map((path) => (
        <Tooltip key={path} label={path}>
          <a
            className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)] transition-colors"
            href={`file://${path}`}
            onClick={(event) => event.stopPropagation()}
            title={path}
          >
            {isImagePath(path) ? (
              <ImageIcon size={12} className="shrink-0 text-[var(--accent)]" />
            ) : (
              <FileIcon size={12} className="shrink-0 text-[var(--muted)]" />
            )}
            <span className="truncate">{getFilename(path)}</span>
          </a>
        </Tooltip>
      ))}
    </div>
  )
}
