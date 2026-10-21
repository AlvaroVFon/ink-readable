import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Document } from '@/lib/types'

import { useEditorConfigContext } from '@/components/editor-config/editor-config-context'
import { useTheme } from '@/components/theme/theme-context'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

import type { ViewMode } from './types'

import { DocumentOutline } from './components/document-outline'
import { useCodeMirror } from './editor/use-code-mirror'
import { setVimLeaderHandlers } from './editor/vim'
import { PrintableNote } from './export/printable-note'
import { useExportNote } from './export/use-export-note'
import { useAutosave } from './hooks/use-autosave'
import { useScrollSync } from './hooks/use-scroll-sync'
import { formatMarkdown } from './lib/format-markdown'
import { getStoredPreviewFirst, storePreviewFirst } from './lib/pane-order'
import { countWords } from './lib/word-count'
import { NotesToolbar } from './notes-toolbar'
import { useNotesVimContext } from './notes-vim-context'
import { MarkdownPreview } from './preview/markdown-preview'

type NotesEditorProps = {
  document: Document
}

/**
 * Split markdown editor: CodeMirror (vim + markdown) and a live preview side by
 * side. The editor is on the left by default; the toolbar can swap the panes
 * (remembered across notes and restarts).
 *
 * The parent remounts this component per document id, so `document.content` is
 * the initial state and there is no external-content synchronization to worry
 * about.
 */
export function NotesEditor({ document }: NotesEditorProps) {
  const [content, setContent] = useState(document.content)
  const [mode, setMode] = useState<ViewMode>('split')
  const [previewFirst, setPreviewFirst] = useState(getStoredPreviewFirst)
  const previewRef = useRef<HTMLDivElement | null>(null)

  const { config } = useEditorConfigContext()
  const { resolvedTheme } = useTheme()
  const { status, saveNow } = useAutosave({ documentId: document.id, content })
  const { containerRef, scrollElement, requestMeasure, getContent, replaceContent, focus } =
    useCodeMirror({
      initialDoc: document.content,
      onChange: setContent,
      onSave: () => {
        void handleSave()
      },
      vimEnabled: config?.vimMotion ?? true,
      relativeLineNumbers: config?.relativeLineNumbers ?? false,
      darkTheme: resolvedTheme === 'dark',
    })

  const {
    focus: focusTarget,
    focusEditor,
    focusSidebar,
    editorFocusRef,
    openFinder,
  } = useNotesVimContext()
  const { open, setOpen } = useSidebar()

  // Expose this editor's focus action so the sidebar can hand focus back, and
  // pull focus in whenever the app switches back to the editor pane.
  useEffect(() => {
    editorFocusRef.current = focus
    return () => {
      editorFocusRef.current = null
    }
  }, [editorFocusRef, focus])

  useEffect(() => {
    if (focusTarget === 'editor') {
      focus()
    }
  }, [focusTarget, focus])

  // LazyVim-style leader: `<Space>e` toggles the sidebar (focusing the tree when
  // it opens), `<Space><Space>` opens the file finder.
  useEffect(() => {
    setVimLeaderHandlers({
      toggleSidebar: () => {
        if (open) {
          setOpen(false)
          focusEditor()
        } else {
          setOpen(true)
          focusSidebar()
        }
      },
      openFinder,
    })
  }, [open, setOpen, focusEditor, focusSidebar, openFinder])

  const title = document.name === '' ? 'Untitled' : document.name
  const wordCount = useMemo(() => countWords(content), [content])
  const {
    exportMarkdown,
    exportPdf,
    print,
    printJob,
    error: exportError,
  } = useExportNote({
    name: title,
    getContent,
  })

  const formatOnSave = config?.formatOnSave ?? false

  // Explicit save (Cmd/Ctrl+S or vim `:w`): format first when enabled, push the
  // result back into the editor and persist it in one go.
  const handleSave = useCallback(async () => {
    const current = getContent()
    let value = current

    if (formatOnSave) {
      try {
        value = await formatMarkdown(current)
      } catch {
        value = current
      }
    }

    if (value !== current) {
      replaceContent(value)
    }

    await saveNow(value)
  }, [formatOnSave, getContent, replaceContent, saveNow])

  const togglePaneOrder = useCallback(() => {
    const next = !previewFirst
    setPreviewFirst(next)
    storePreviewFirst(next)
  }, [previewFirst])

  useScrollSync(scrollElement, previewRef, mode === 'split')

  useEffect(() => {
    if (mode !== 'preview') {
      requestMeasure()
    }
  }, [mode, requestMeasure])

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <NotesToolbar
        exportError={exportError}
        mode={mode}
        onExport={(format) => {
          if (format === 'markdown') {
            void exportMarkdown()
          } else {
            exportPdf()
          }
        }}
        onModeChange={setMode}
        onSwapPanes={togglePaneOrder}
        previewFirst={previewFirst}
        status={status}
        title={title}
        wordCount={wordCount}
      />
      <div
        className={cn(
          'grid min-h-0 flex-1',
          mode === 'split'
            ? previewFirst
              ? 'grid-cols-[55fr_45fr]'
              : 'grid-cols-[45fr_55fr]'
            : 'grid-cols-1',
        )}
      >
        {/* The editor stays mounted in every mode: unmounting it detaches the
            CodeMirror DOM and leaves the pane blank when coming back. Swapping
            the panes only changes the CSS order for the same reason, so the
            divider is drawn on whichever pane ends up on the right. */}
        <div
          className={cn(
            'min-h-0 overflow-hidden bg-paper',
            mode === 'preview' && 'hidden',
            mode === 'split' && previewFirst && 'order-last border-l border-rule/70',
          )}
        >
          <div
            className='h-full'
            ref={containerRef}
          />
        </div>
        {mode !== 'edit' && (
          <div
            className={cn(
              'min-h-0 overflow-auto bg-desk/40',
              mode === 'split' && (previewFirst ? 'order-first' : 'border-l border-rule/70'),
            )}
            ref={previewRef}
          >
            <div className='flex min-h-full items-start'>
              <DocumentOutline scrollRef={previewRef} />
              <div className='note-sheet min-w-0 flex-1'>
                <MarkdownPreview content={content} />
              </div>
            </div>
          </div>
        )}
      </div>
      {printJob !== null && (
        <PrintableNote
          key={printJob.id}
          content={printJob.content}
          onReady={() => {
            void print()
          }}
          title={title}
        />
      )}
    </div>
  )
}
