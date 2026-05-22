import type { Database } from 'better-sqlite3'

export const applySchemaVersion20 = (db: Database) => {
  const tables = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map(
      (row) => row.name
    )
  )
  if (!tables.has('command_presets')) return

  db.prepare("DELETE FROM command_presets WHERE id = 'reasonix' AND is_builtin = 1").run()
}
