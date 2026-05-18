import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, test, vi } from 'vitest'

import { HIVE_USAGE, handleHiveInfoCommand, runHiveCommand } from '../../src/cli/hive.js'
import {
  HIVE_UPDATE_USAGE,
  type RunUpdate,
  runHiveUpdateCommand,
} from '../../src/cli/hive-update.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hive cli', () => {
  test('prints help without starting the runtime', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(handleHiveInfoCommand(['--help'])).toBe(true)

    expect(logSpy).toHaveBeenCalledWith(HIVE_USAGE)
  })

  test('prints package version without starting the runtime', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string

    expect(handleHiveInfoCommand(['--version'])).toBe(true)

    expect(logSpy).toHaveBeenCalledWith(version)
  })

  test('rejects unknown arguments instead of ignoring them', async () => {
    await expect(runHiveCommand(['--bogus'])).rejects.toThrow('Unknown option: --bogus')
    await expect(runHiveCommand(['--port', '0', 'extra'])).rejects.toThrow(
      'Unknown argument: extra'
    )
  })

  test('starts http server and prints listening address', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await runHiveCommand(['--port', '0'])

    try {
      expect(result.port).toBeGreaterThan(0)
      expect(logSpy).toHaveBeenCalledWith(`Hive running at http://127.0.0.1:${result.port}`)
    } finally {
      await result.close()
    }
  })

  test('prints a non-blocking update hint after startup when a newer npm version exists', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await runHiveCommand(['--port', '0'], {
      versionService: {
        getVersionInfo: async () => ({
          current_version: '0.6.0-alpha.3',
          install_hint: 'npm install -g @tt-a1i/hive@latest',
          latest_version: '0.6.0-alpha.4',
          package_name: '@tt-a1i/hive',
          release_url: 'https://www.npmjs.com/package/@tt-a1i/hive/v/0.6.0-alpha.4',
          update_available: true,
        }),
      },
    })

    try {
      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(
          'Hive update available: 0.6.0-alpha.3 -> 0.6.0-alpha.4. Run: npm install -g @tt-a1i/hive@latest'
        )
      })
    } finally {
      await result.close()
    }
  })
})

describe('hive update cli', () => {
  test('--help prints update usage and exits 0 without invoking npm', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    let runUpdateInvoked = false
    const runUpdate: RunUpdate = async () => {
      runUpdateInvoked = true
      return { exitCode: 0 }
    }

    const code = await runHiveUpdateCommand(['--help'], { runUpdate })

    expect(code).toBe(0)
    expect(logSpy).toHaveBeenCalledWith(HIVE_UPDATE_USAGE)
    expect(runUpdateInvoked).toBe(false)
  })

  test('successful npm install exits 0 and prints a restart hint', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const calls: Array<{ command: string; args: string[] }> = []
    const runUpdate: RunUpdate = async (command, args) => {
      calls.push({ command, args })
      return { exitCode: 0 }
    }

    const code = await runHiveUpdateCommand([], { runUpdate })

    expect(code).toBe(0)
    expect(calls).toEqual([{ command: 'npm', args: ['install', '-g', '@tt-a1i/hive@latest'] }])
    expect(logSpy).toHaveBeenCalledWith('Running: npm install -g @tt-a1i/hive@latest')
    expect(logSpy).toHaveBeenCalledWith(
      'Hive updated. Restart any running Hive process to pick up the new version.'
    )
  })

  test('non-zero npm exit propagates the code and prints an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const runUpdate: RunUpdate = async () => ({ exitCode: 7 })

    const code = await runHiveUpdateCommand([], { runUpdate })

    expect(code).toBe(7)
    expect(errorSpy).toHaveBeenCalledWith('npm install exited with code 7.')
  })

  test('spawn error (npm not on PATH) exits 1 and surfaces the manual fallback hint', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const runUpdate: RunUpdate = async () => ({
      exitCode: 1,
      spawnError: Object.assign(new Error('spawn npm ENOENT'), { code: 'ENOENT' }),
    })

    const code = await runHiveUpdateCommand([], { runUpdate })

    expect(code).toBe(1)
    expect(errorSpy).toHaveBeenCalledWith('Failed to spawn npm: spawn npm ENOENT')
    expect(errorSpy).toHaveBeenCalledWith(
      'You can run the upgrade manually: npm install -g @tt-a1i/hive@latest'
    )
  })

  test('unknown arguments are rejected before invoking npm', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let runUpdateInvoked = false
    const runUpdate: RunUpdate = async () => {
      runUpdateInvoked = true
      return { exitCode: 0 }
    }

    const code = await runHiveUpdateCommand(['--bogus'], { runUpdate })

    expect(code).toBe(1)
    expect(errorSpy).toHaveBeenCalledWith('Unknown argument: --bogus')
    expect(runUpdateInvoked).toBe(false)
  })
})
