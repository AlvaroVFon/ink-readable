import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  applyTheme,
  getStoredMode,
  getStoredPalette,
  getSystemTheme,
  resolveTheme,
  storeMode,
  storePalette,
  type Palette,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme'

import { ThemeContext, type ThemeContextValue } from './theme-context'

type ThemeProviderProps = {
  children: ReactNode
}

/**
 * Owns the light/dark/system mode and the color palette for the whole app.
 *
 * The resolved mode is mirrored onto `<html class="dark">` and the palette onto
 * `<html data-palette>`, so every shadcn token flips at once. `resolvedTheme`
 * is exposed for imperative consumers (CodeMirror, Mermaid). Both choices
 * persist in localStorage.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode())
  const [palette, setPaletteState] = useState<Palette>(() => getStoredPalette())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredMode()),
  )

  useEffect(() => {
    const resolved = resolveTheme(mode)
    // oxlint-disable-next-line react/set-state-in-effect -- mirroring an external system (matchMedia/localStorage) into React state
    setResolvedTheme(resolved)
    applyTheme(resolved, palette)
    storeMode(mode)
    storePalette(palette)

    if (mode !== 'system') {
      return () => {}
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const next = getSystemTheme()
      setResolvedTheme(next)
      applyTheme(next, palette)
    }
    media.addEventListener('change', handleChange)
    return () => {
      media.removeEventListener('change', handleChange)
    }
  }, [mode, palette])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
  }, [])

  const setPalette = useCallback((next: Palette) => {
    setPaletteState(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, palette, setMode, setPalette }),
    [mode, resolvedTheme, palette, setMode, setPalette],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
