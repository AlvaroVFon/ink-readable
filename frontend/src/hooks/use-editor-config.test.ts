import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EditorConfig } from '@/lib/types'

const api = vi.hoisted(() => ({
  fetchEditorConfig: vi.fn<() => Promise<EditorConfig>>(),
  updateEditorConfigDarkTheme: vi.fn<(darkTheme: boolean) => Promise<void>>(),
  updateEditorConfigVimMotion: vi.fn<(vimMotion: boolean) => Promise<void>>(),
  updateEditorConfigFormatOnSave: vi.fn<(formatOnSave: boolean) => Promise<void>>(),
  updateEditorConfigRelativeLineNumbers: vi.fn<(relativeLineNumbers: boolean) => Promise<void>>(),
}))

vi.mock('@/lib/api', () => api)

import { useEditorConfig } from './use-editor-config'

const config: EditorConfig = {
  id: 'default',
  darkTheme: true,
  vimMotion: true,
  formatOnSave: true,
  relativeLineNumbers: true,
}

describe('useEditorConfig', () => {
  beforeEach(() => {
    api.fetchEditorConfig.mockReset()
    api.updateEditorConfigDarkTheme.mockReset()
    api.updateEditorConfigVimMotion.mockReset()
    api.updateEditorConfigFormatOnSave.mockReset()
    api.updateEditorConfigRelativeLineNumbers.mockReset()
  })

  it('loads the editor config', async () => {
    api.fetchEditorConfig.mockResolvedValue(config)

    const { result } = renderHook(() => useEditorConfig())

    await waitFor(() => expect(result.current.config).toEqual(config))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('updates the dark theme preference', async () => {
    api.fetchEditorConfig.mockResolvedValue(config)
    api.updateEditorConfigDarkTheme.mockResolvedValue(undefined)

    const { result } = renderHook(() => useEditorConfig())
    await waitFor(() => expect(result.current.config).not.toBeNull())

    await act(async () => {
      await result.current.updateDarkTheme(false)
    })

    expect(api.updateEditorConfigDarkTheme).toHaveBeenCalledWith(false)
    expect(result.current.config?.darkTheme).toBe(false)
    expect(result.current.config?.vimMotion).toBe(true)
  })

  it('updates the vim motion preference', async () => {
    api.fetchEditorConfig.mockResolvedValue(config)
    api.updateEditorConfigVimMotion.mockResolvedValue(undefined)

    const { result } = renderHook(() => useEditorConfig())
    await waitFor(() => expect(result.current.config).not.toBeNull())

    await act(async () => {
      await result.current.updateVimMotion(false)
    })

    expect(api.updateEditorConfigVimMotion).toHaveBeenCalledWith(false)
    expect(result.current.config?.vimMotion).toBe(false)
    expect(result.current.config?.darkTheme).toBe(true)
  })

  it('updates the format on save preference', async () => {
    api.fetchEditorConfig.mockResolvedValue(config)
    api.updateEditorConfigFormatOnSave.mockResolvedValue(undefined)

    const { result } = renderHook(() => useEditorConfig())
    await waitFor(() => expect(result.current.config).not.toBeNull())

    await act(async () => {
      await result.current.updateFormatOnSave(false)
    })

    expect(api.updateEditorConfigFormatOnSave).toHaveBeenCalledWith(false)
    expect(result.current.config?.formatOnSave).toBe(false)
    expect(result.current.config?.vimMotion).toBe(true)
  })

  it('updates the relative line numbers preference', async () => {
    api.fetchEditorConfig.mockResolvedValue(config)
    api.updateEditorConfigRelativeLineNumbers.mockResolvedValue(undefined)

    const { result } = renderHook(() => useEditorConfig())
    await waitFor(() => expect(result.current.config).not.toBeNull())

    await act(async () => {
      await result.current.updateRelativeLineNumbers(false)
    })

    expect(api.updateEditorConfigRelativeLineNumbers).toHaveBeenCalledWith(false)
    expect(result.current.config?.relativeLineNumbers).toBe(false)
    expect(result.current.config?.formatOnSave).toBe(true)
  })

  it('exposes the error when loading fails', async () => {
    api.fetchEditorConfig.mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useEditorConfig())

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('offline')
    expect(result.current.isLoading).toBe(false)
  })

  it('keeps the current value and exposes the error when an update fails', async () => {
    api.fetchEditorConfig.mockResolvedValue(config)
    api.updateEditorConfigDarkTheme.mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useEditorConfig())
    await waitFor(() => expect(result.current.config).not.toBeNull())

    await act(async () => {
      await result.current.updateDarkTheme(false)
    })

    expect(result.current.config?.darkTheme).toBe(true)
    expect(result.current.error?.message).toBe('offline')
  })
})
