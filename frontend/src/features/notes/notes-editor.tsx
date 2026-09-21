import { useRef, useState } from 'react'

import type { Document } from '@/lib/types'

import { cn } from '@/lib/utils'

import type { ViewMode } from './types'

import { useCodeMirror } from './editor/use-code-mirror'
import { useAutosave } from './hooks/use-autosave'
import { useScrollSync } from './hooks/use-scroll-sync'
import { NotesToolbar } from './notes-toolbar'
import { MarkdownPreview } from './preview/markdown-preview'

type NotesEditorProps = {
  document: Document
}

/**
 * Split markdown editor: CodeMirror (vim + markdown) on the left, live preview
 * on the right.
 *
 * The parent remounts this component per document id, so `document.content` is
 * the initial state and there is no external-content synchronization to worry
 * about.
 */
export function NotesEditor({ document }: NotesEditorProps) {
  const [content, setContent] = useState(document.content)
  const [mode, setMode] = useState<ViewMode>('split')
  const previewRef = useRef<HTMLDivElement | null>(null)

  const { status, saveNow } = useAutosave({ documentId: document.id, content })
  const { containerRef, scrollElement } = useCodeMirror({
    initialDoc: document.content,
    onChange: setContent,
    onSave: () => {
      void saveNow()
    },
  })

  useScrollSync(scrollElement, previewRef, mode === 'split')

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <NotesToolbar
        mode={mode}
        onModeChange={setMode}
        status={status}
        title={document.name === '' ? 'Untitled' : document.name}
      />
      <div
        className={cn(
          'grid min-h-0 flex-1',
          mode === 'split' ? 'grid-cols-2 divide-x' : 'grid-cols-1',
        )}
      >
        {mode !== 'preview' && (
          <div className='min-h-0 overflow-hidden'>
            <div
              className='h-full'
              ref={containerRef}
            />
          </div>
        )}
        {mode !== 'edit' && (
          <div
            className='min-h-0 overflow-auto'
            ref={previewRef}
          >
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>
    </div>
  )
}
