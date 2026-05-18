import { spawn } from 'node:child_process'

import { PACKAGE_NAME } from '../server/package-version.js'

export const HIVE_UPDATE_USAGE = [
  'Usage:',
  '  hive update',
  '',
  `Runs \`npm install -g ${PACKAGE_NAME}@latest\` to upgrade Hive in place.`,
  'Restart any running Hive process afterwards to pick up the new version.',
  '',
  'Options:',
  '  -h, --help      Print this help.',
].join('\n')

export interface RunUpdateResult {
  exitCode: number
  spawnError?: Error
}

export type RunUpdate = (command: string, args: string[]) => Promise<RunUpdateResult>

const defaultRunUpdate: RunUpdate = (command, args) =>
  new Promise<RunUpdateResult>((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    let resolved = false

    const finalize = (result: RunUpdateResult) => {
      if (resolved) return
      resolved = true
      resolve(result)
    }

    child.on('error', (error) => {
      finalize({ exitCode: 1, spawnError: error })
    })
    child.on('close', (code) => {
      finalize({ exitCode: typeof code === 'number' ? code : 1 })
    })
  })

export const runHiveUpdateCommand = async (
  argv: string[],
  options: { runUpdate?: RunUpdate } = {}
): Promise<number> => {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HIVE_UPDATE_USAGE)
    return 0
  }

  // Reject unknown flags rather than silently ignoring them — keeps behavior
  // consistent with how `parsePort` validates `hive` itself.
  const extra = argv.find((arg) => arg !== '--help' && arg !== '-h')
  if (extra !== undefined) {
    console.error(`Unknown argument: ${extra}`)
    console.error(HIVE_UPDATE_USAGE)
    return 1
  }

  const run = options.runUpdate ?? defaultRunUpdate
  const args = ['install', '-g', `${PACKAGE_NAME}@latest`]
  console.log(`Running: npm ${args.join(' ')}`)

  const result = await run('npm', args)

  if (result.spawnError) {
    console.error(`Failed to spawn npm: ${result.spawnError.message}`)
    console.error(`You can run the upgrade manually: npm install -g ${PACKAGE_NAME}@latest`)
    return 1
  }

  if (result.exitCode === 0) {
    console.log('Hive updated. Restart any running Hive process to pick up the new version.')
    return 0
  }

  console.error(`npm install exited with code ${result.exitCode}.`)
  return result.exitCode
}
