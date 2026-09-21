import { useCallback, useEffect, useState } from 'react'

import type { EditorConfig } from '@/lib/types'

import {
  fetchEditorConfig,
  updateEditorConfigDarkTheme,
  updateEditorConfigFormatOnSave,
  updateEditorConfigVimMotion,
} from '@/lib/api'

export type UseEditorConfigResult = {
  config: EditorConfig | null
  isLoading: boolean
  error: Error | null
  updateDarkTheme: (darkTheme: boolean) => Promise<void>
  updateVimMotion: (vimMotion: boolean) => Promise<void>
  updateFormatOnSave: (formatOnSave: boolean) => Promise<void>
  reload: () => void
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Unable to load the editor config')
}

/**
 * Loads the singleton editor preferences and exposes optimistic-free updates.
 *
 * Each preference is persisted through its own endpoint, so an update only
 * replaces the field it touches and never clobbers the other one.
 */
export function useEditorConfig(): UseEditorConfigResult {
  const [config, setConfig] = useState<EditorConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(() => {
    setIsLoading(true)
    fetchEditorConfig()
      .then((value) => {
        setConfig(value)
        setError(null)
      })
      .catch((cause: unknown) => {
        setError(toError(cause))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- loading the editor config on mount
    refresh()
  }, [refresh])

  const updateDarkTheme = useCallback(async (darkTheme: boolean) => {
    try {
      await updateEditorConfigDarkTheme(darkTheme)
      setConfig((current) => (current === null ? current : { ...current, darkTheme }))
      setError(null)
    } catch (cause) {
      setError(toError(cause))
    }
  }, [])

  const updateVimMotion = useCallback(async (vimMotion: boolean) => {
    try {
      await updateEditorConfigVimMotion(vimMotion)
      setConfig((current) => (current === null ? current : { ...current, vimMotion }))
      setError(null)
    } catch (cause) {
      setError(toError(cause))
    }
  }, [])

  const updateFormatOnSave = useCallback(async (formatOnSave: boolean) => {
    try {
      await updateEditorConfigFormatOnSave(formatOnSave)
      setConfig((current) => (current === null ? current : { ...current, formatOnSave }))
      setError(null)
    } catch (cause) {
      setError(toError(cause))
    }
  }, [])

  const reload = useCallback(() => {
    refresh()
  }, [refresh])

  return {
    config,
    isLoading,
    error,
    updateDarkTheme,
    updateVimMotion,
    updateFormatOnSave,
    reload,
  }
}
