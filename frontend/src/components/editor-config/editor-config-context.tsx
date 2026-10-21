/* oxlint-disable react/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'

import { useEditorConfig, type UseEditorConfigResult } from '@/hooks/use-editor-config'

const EditorConfigContext = createContext<UseEditorConfigResult | null>(null)

/**
 * Owns the persisted editor preferences for the whole app.
 *
 * The app's light/dark mode belongs to `ThemeProvider`; `darkTheme` here only
 * affects the notes editor surface, so the appearance control is the single
 * source of truth for the rest of the UI.
 */
export function EditorConfigProvider({ children }: { children: ReactNode }) {
  const editorConfig = useEditorConfig()
  return (
    <EditorConfigContext.Provider value={editorConfig}>{children}</EditorConfigContext.Provider>
  )
}

/** Like `useEditorConfigContext`, but `null` outside a provider instead of throwing. */
export function useOptionalEditorConfig(): UseEditorConfigResult | null {
  return useContext(EditorConfigContext)
}

export function useEditorConfigContext(): UseEditorConfigResult {
  const context = useContext(EditorConfigContext)
  if (context === null) {
    throw new Error('useEditorConfigContext must be used within an EditorConfigProvider')
  }
  return context
}
