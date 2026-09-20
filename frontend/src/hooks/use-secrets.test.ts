import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Secrets } from '@/lib/types'

const { fetchSecrets } = vi.hoisted(() => ({ fetchSecrets: vi.fn<() => Promise<Secrets>>() }))

vi.mock('@/lib/api/config', () => ({ CONFIG_PATH: '/config', fetchSecrets }))

async function loadUseSecrets() {
  vi.resetModules()
  const module = await import('./use-secrets')
  return module.useSecrets
}

describe('useSecrets', () => {
  beforeEach(() => {
    fetchSecrets.mockReset()
  })

  it('loads the secrets', async () => {
    const secrets = { 'app.port': '8080' }
    fetchSecrets.mockResolvedValue(secrets)
    const useSecrets = await loadUseSecrets()

    const { result } = renderHook(() => useSecrets())

    await waitFor(() => expect(result.current.secrets).toEqual(secrets))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('shares the in-flight request between consumers', async () => {
    fetchSecrets.mockResolvedValue({ 'app.port': '8080' })
    const useSecrets = await loadUseSecrets()

    const first = renderHook(() => useSecrets())
    const second = renderHook(() => useSecrets())

    await waitFor(() => expect(first.result.current.secrets).not.toBeNull())
    await waitFor(() => expect(second.result.current.secrets).not.toBeNull())
    expect(fetchSecrets).toHaveBeenCalledTimes(1)
  })

  it('refetches on demand', async () => {
    fetchSecrets.mockResolvedValue({ 'app.port': '8080' })
    const useSecrets = await loadUseSecrets()

    const { result } = renderHook(() => useSecrets())
    await waitFor(() => expect(result.current.secrets).not.toBeNull())

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => expect(fetchSecrets).toHaveBeenCalledTimes(2))
  })

  it('exposes the error when the request fails', async () => {
    fetchSecrets.mockRejectedValue(new Error('vault unavailable'))
    const useSecrets = await loadUseSecrets()

    const { result } = renderHook(() => useSecrets())

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('vault unavailable')
    expect(result.current.isLoading).toBe(false)
  })
})
