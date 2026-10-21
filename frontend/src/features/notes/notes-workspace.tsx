import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'

import { EmptyState } from '@/components/ui/empty-state'
import { Kbd } from '@/components/ui/kbd'
import { useDocument } from '@/hooks/use-document'

import { NotesEditor } from './notes-editor'
import { useNotesWorkspaceContext } from './notes-workspace-context'

function NotesPlaceholder() {
  return (
    <EmptyState
      description='Choose a note in the sidebar, or create one with the + button. Search across every vault without leaving the keyboard.'
      title='No note open'
    >
      <span className='inline-flex items-center gap-2 text-xs text-graphite'>
        <Kbd>⌘K</Kbd>
        Search notes
      </span>
    </EmptyState>
  )
}

function NotesStatus({ message, tone = 'muted' }: { message: string; tone?: 'muted' | 'error' }) {
  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <p
        className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-graphite'}
        role='status'
      >
        {message}
      </p>
    </div>
  )
}

export function NotesWorkspace() {
  const { documentId } = useParams()
  const { revision } = useNotesWorkspaceContext()
  const { document, isLoading, error, reload } = useDocument(documentId)
  const lastRevision = useRef(revision)

  useEffect(() => {
    if (lastRevision.current === revision) {
      return
    }
    lastRevision.current = revision
    reload()
  }, [revision, reload])

  if (documentId === undefined) {
    return <NotesPlaceholder />
  }

  if (isLoading) {
    return <NotesStatus message='Loading document…' />
  }

  if (error !== null) {
    return (
      <NotesStatus
        message={error.message}
        tone='error'
      />
    )
  }

  if (document === null) {
    return <NotesStatus message='Document not found.' />
  }

  return (
    <NotesEditor
      key={document.id}
      document={document}
    />
  )
}
