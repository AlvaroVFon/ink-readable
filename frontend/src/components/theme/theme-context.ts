import { createContext, useContext } from 'react'

import type { Palette, ResolvedTheme, ThemeMode } from '@/lib/theme'

export type ThemeContextValue = {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  palette: Palette
  setMode: (mode: ThemeMode) => void
  setPalette: (palette: Palette) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Reads the active theme.
 *
 * Must be used inside a `ThemeProvider`. `resolvedTheme` tells editor chrome
 * (CodeMirror, Mermaid) whether to render light or dark, while `palette` names
 * the color palette applied through `data-palette` on `<html>`. React trees
 * styled with shadcn tokens update automatically.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
