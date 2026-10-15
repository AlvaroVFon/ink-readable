import { invoke } from '@tauri-apps/api/core'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_BASE_URL } from './http'
import {
  checkForUpdate,
  isTauri,
  openDataDir,
  printWindow,
  resolveApiBaseUrl,
  saveMarkdownFile,
} from './tauri'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }))

const invokeMock = vi.mocked(invoke)
const checkMock = vi.mocked(check)

function setTauriInternals(): void {
  Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true })
}

function clearTauriInternals(): void {
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__')
}

describe('isTauri', () => {
  afterEach(clearTauriInternals)

  it('is false without the webview internals', () => {
    expect(isTauri()).toBe(false)
  })

  it('is true when the webview injects the internals', () => {
    setTauriInternals()
    expect(isTauri()).toBe(true)
  })
})

describe('resolveApiBaseUrl', () => {
  afterEach(() => {
    clearTauriInternals()
    invokeMock.mockReset()
  })

  it('returns the relative default in the browser', async () => {
    expect(await resolveApiBaseUrl()).toBe(API_BASE_URL)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('asks the shell for the sidecar URL when running in Tauri', async () => {
    setTauriInternals()
    invokeMock.mockResolvedValue('http://127.0.0.1:4444')

    expect(await resolveApiBaseUrl()).toBe('http://127.0.0.1:4444/api/v1')
    expect(invokeMock).toHaveBeenCalledWith('get_api_url')
  })
})

describe('openDataDir', () => {
  afterEach(() => {
    clearTauriInternals()
    invokeMock.mockReset()
  })

  it('does nothing outside the desktop shell', async () => {
    await openDataDir()

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('invokes the shell command in the desktop shell', async () => {
    setTauriInternals()
    invokeMock.mockResolvedValue(undefined)

    await openDataDir()

    expect(invokeMock).toHaveBeenCalledWith('open_data_dir')
  })
})

describe('saveMarkdownFile', () => {
  afterEach(() => {
    clearTauriInternals()
    invokeMock.mockReset()
    vi.restoreAllMocks()
  })

  it('downloads a blob in the browser', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:note')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    expect(await saveMarkdownFile('note.md', '# Hi')).toBe(true)

    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:note')
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('invokes the shell command in the desktop shell', async () => {
    setTauriInternals()
    invokeMock.mockResolvedValue(false)

    expect(await saveMarkdownFile('note.md', '# Hi')).toBe(false)
    expect(invokeMock).toHaveBeenCalledWith('export_markdown', {
      fileName: 'note.md',
      contents: '# Hi',
    })
  })
})

describe('printWindow', () => {
  afterEach(() => {
    clearTauriInternals()
    invokeMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('uses window.print in the browser', async () => {
    // happy-dom does not implement window.print.
    const print = vi.fn()
    vi.stubGlobal('print', print)

    await printWindow()

    expect(print).toHaveBeenCalledOnce()
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('invokes the shell command in the desktop shell', async () => {
    setTauriInternals()
    invokeMock.mockResolvedValue(undefined)

    await printWindow()

    expect(invokeMock).toHaveBeenCalledWith('print_webview')
  })
})

describe('checkForUpdate', () => {
  afterEach(() => {
    clearTauriInternals()
    invokeMock.mockReset()
    checkMock.mockReset()
  })

  it('resolves to null outside the desktop shell', async () => {
    expect(await checkForUpdate()).toBeNull()
    expect(checkMock).not.toHaveBeenCalled()
  })

  it('resolves to null when the app is up to date', async () => {
    setTauriInternals()
    checkMock.mockResolvedValue(null)

    expect(await checkForUpdate()).toBeNull()
  })

  it('downloads, stops the backend, installs and restarts', async () => {
    setTauriInternals()
    const calls: string[] = []
    const download = vi.fn(async (onEvent: (event: unknown) => void) => {
      calls.push('download')
      onEvent({ event: 'Started', data: { contentLength: 200 } })
      onEvent({ event: 'Progress', data: { chunkLength: 50 } })
      onEvent({ event: 'Progress', data: { chunkLength: 150 } })
      onEvent({ event: 'Finished' })
    })
    const install = vi.fn(async () => {
      calls.push('install')
    })
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only the members checkForUpdate uses
    checkMock.mockResolvedValue({ version: '0.2.0', download, install } as unknown as Update)
    invokeMock.mockImplementation(async (command) => {
      calls.push(command)
    })

    const update = await checkForUpdate()
    expect(update?.version).toBe('0.2.0')

    const onProgress = vi.fn()
    await update?.install(onProgress)

    expect(calls).toEqual(['download', 'stop_backend', 'install', 'restart_app'])
    expect(onProgress).toHaveBeenLastCalledWith(200, 200)
  })
})
