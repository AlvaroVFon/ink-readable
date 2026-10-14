import { invoke } from '@tauri-apps/api/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_BASE_URL } from './http'
import { isTauri, resolveApiBaseUrl } from './tauri'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const invokeMock = vi.mocked(invoke)

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
