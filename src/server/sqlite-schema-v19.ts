import type { Database } from 'better-sqlite3'

import { BUILTIN_COMMAND_PRESETS } from './command-preset-defaults.js'

const NEW_PRESET_IDS = ['pi']

export const applySchemaVersion19 = (db: Database) => {
  const now = Date.now()

  const tables = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map(
      (row) => row.name
    )
  )
  if (!tables.has('command_presets')) return

  const existingIds = new Set(
    (
      db.prepare('SELECT id FROM command_presets').all() as Array<{ id: string }>
    ).map((row) => row.id)
  )

  const insertPreset = db.prepare(
    `INSERT INTO command_presets (
       id, display_name, command, args, env, resume_args_template, session_id_capture,
       yolo_args_template, is_builtin, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  )

  for (const presetId of NEW_PRESET_IDS) {
    if (existingIds.has(presetId)) continue
    const preset = BUILTIN_COMMAND_PRESETS.find((p) => p.id === presetId)
    if (!preset) continue
    insertPreset.run(
      preset.id,
      preset.displayName,
      preset.command,
      '[]',
      '{}',
      preset.resumeArgsTemplate,
      preset.sessionIdCapture ? JSON.stringify(preset.sessionIdCapture) : null,
      preset.yoloArgsTemplate ? JSON.stringify(preset.yoloArgsTemplate) : null,
      now,
      now
    )
  }
}
