import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  applyResolvedTheme,
  getStoredTheme,
  getSystemTheme,
  resolveTheme,
  storeTheme,
  type ResolvedTheme,
  type Theme,
} from '@/lib/theme'

import { ThemeContext, type ThemeContextValue } from './theme-context'

type ThemeProviderProps = {
  children: ReactNode
}

/**
 * Owns the light/dark/system preference for the whole app.
 *
 * The resolved theme is mirrored onto `<html class="dark">`, so every shadcn
 * token flips at once, and `resolvedTheme` is exposed for imperative consumers
 * (CodeMirror, Mermaid). The choice persists in localStorage.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredTheme()),
  )

  useEffect(() => {
    const resolved = resolveTheme(theme)
    // oxlint-disable-next-line react/set-state-in-effect -- mirroring an external system (matchMedia/localStorage) into React state
    setResolvedTheme(resolved)
    applyResolvedTheme(resolved)
    storeTheme(theme)

    if (theme !== 'system') {
      return () => {}
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const next = getSystemTheme()
      setResolvedTheme(next)
      applyResolvedTheme(next)
    }
    media.addEventListener('change', handleChange)
    return () => {
      media.removeEventListener('change', handleChange)
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
