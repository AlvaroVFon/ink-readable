/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, type ReactNode } from 'react'

import { useTheme } from '@/components/theme/theme-context'
import { useEditorConfig, type UseEditorConfigResult } from '@/hooks/use-editor-config'

const EditorConfigContext = createContext<UseEditorConfigResult | null>(null)

/**
 * Owns the persisted editor preferences for the whole app.
 *
 * Besides exposing the config, it applies the `darkTheme` preference through
 * the active `ThemeProvider`, so toggling it in the settings popup updates the
 * whole UI (and survives reloads).
 */
export function EditorConfigProvider({ children }: { children: ReactNode }) {
  const editorConfig = useEditorConfig()
  const { setTheme } = useTheme()
  const darkTheme = editorConfig.config?.darkTheme

  useEffect(() => {
    if (darkTheme === undefined) {
      return
    }
    setTheme(darkTheme ? 'dark' : 'light')
  }, [darkTheme, setTheme])

  return (
    <EditorConfigContext.Provider value={editorConfig}>{children}</EditorConfigContext.Provider>
  )
}

export function useEditorConfigContext(): UseEditorConfigResult {
  const context = useContext(EditorConfigContext)
  if (context === null) {
    throw new Error('useEditorConfigContext must be used within an EditorConfigProvider')
  }
  return context
}
