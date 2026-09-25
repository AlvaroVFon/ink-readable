/* oxlint-disable react/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'

export type NotesFocusTarget = 'editor' | 'sidebar'

type NotesVimContextValue = {
  /** Which pane owns keyboard focus, used to move focus across panes. */
  focus: NotesFocusTarget
  finderOpen: boolean
  /** Registered by the editor so the sidebar can hand focus back to it. */
  editorFocusRef: MutableRefObject<(() => void) | null>
  focusEditor: () => void
  focusSidebar: () => void
  openFinder: () => void
  closeFinder: () => void
  toggleFinder: () => void
}

const NotesVimContext = createContext<NotesVimContextValue | null>(null)

/**
 * Coordinates the vim-like keyboard flow between the notes sidebar tree and the
 * editor: which pane is focused and whether the file finder is open.
 *
 * The actual DOM focus stays component-local (the tree focuses its container,
 * the editor focuses its `EditorView`); this context only carries the intent to
 * move it, which keeps the two panes decoupled.
 */
export function NotesVimProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<NotesFocusTarget>('editor')
  const [finderOpen, setFinderOpen] = useState(false)
  const editorFocusRef = useRef<(() => void) | null>(null)

  const focusEditor = useCallback(() => {
    setFocus('editor')
  }, [])

  const focusSidebar = useCallback(() => {
    setFocus('sidebar')
  }, [])

  const openFinder = useCallback(() => {
    setFinderOpen(true)
  }, [])

  const closeFinder = useCallback(() => {
    setFinderOpen(false)
  }, [])

  const toggleFinder = useCallback(() => {
    setFinderOpen((current) => !current)
  }, [])

  const value = useMemo<NotesVimContextValue>(
    () => ({
      focus,
      finderOpen,
      editorFocusRef,
      focusEditor,
      focusSidebar,
      openFinder,
      closeFinder,
      toggleFinder,
    }),
    [focus, finderOpen, focusEditor, focusSidebar, openFinder, closeFinder, toggleFinder],
  )

  return <NotesVimContext.Provider value={value}>{children}</NotesVimContext.Provider>
}

export function useNotesVimContext(): NotesVimContextValue {
  const context = useContext(NotesVimContext)
  if (context === null) {
    throw new Error('useNotesVimContext must be used within a NotesVimProvider')
  }
  return context
}
