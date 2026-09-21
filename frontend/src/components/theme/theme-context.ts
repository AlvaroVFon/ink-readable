import { createContext, useContext } from 'react'

import type { ResolvedTheme, Theme } from '@/lib/theme'

export type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Reads the active theme.
 *
 * Must be used inside a `ThemeProvider`. Editor chrome (CodeMirror, Mermaid)
 * relies on `resolvedTheme` to pick light/dark rendering, while React trees
 * styled with shadcn tokens update automatically through the `.dark` class.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
