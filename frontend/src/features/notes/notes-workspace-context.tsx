/* oxlint-disable react/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'

import { useNotesWorkspace, type UseNotesWorkspaceResult } from './hooks/use-notes-workspace'

const NotesWorkspaceContext = createContext<UseNotesWorkspaceResult | null>(null)

/**
 * Owns the notes workspace (vaults, documents and mutations) for the whole
 * `/notes` section, so the sidebar tree and the editor share one source of
 * truth: renaming or deleting in the tree immediately reaches the open editor.
 */
export function NotesWorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useNotesWorkspace()

  return (
    <NotesWorkspaceContext.Provider value={workspace}>{children}</NotesWorkspaceContext.Provider>
  )
}

export function useNotesWorkspaceContext(): UseNotesWorkspaceResult {
  const workspace = useContext(NotesWorkspaceContext)
  if (workspace === null) {
    throw new Error('useNotesWorkspaceContext must be used within a NotesWorkspaceProvider')
  }
  return workspace
}
