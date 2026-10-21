import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { useDocument } from '@/hooks/use-document'

import { resolveCreateScope } from './lib/file-tree'
import { NotesEditor } from './notes-editor'
import { useNotesWorkspaceContext } from './notes-workspace-context'

function NotesPlaceholder() {
  const { tree, vaults, createNote } = useNotesWorkspaceContext()
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const scope = resolveCreateScope(tree, vaults, null, undefined)

  const create = async () => {
    if (scope === null || isCreating) {
      return
    }
    setIsCreating(true)
    try {
      const document = await createNote(scope)
      void navigate(`/notes/${document.id}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <section className='flex max-w-sm flex-col items-center gap-3 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Notes</h1>
        <p className='text-sm text-muted-foreground'>
          Select or create a document to start writing.
        </p>
        {scope !== null ? (
          <Button
            disabled={isCreating}
            onClick={() => {
              void create()
            }}
          >
            New note
          </Button>
        ) : (
          <p className='text-xs text-muted-foreground'>Create a vault from the sidebar first.</p>
        )}
        <p className='text-xs text-muted-foreground'>Use search in the sidebar to find a note.</p>
      </section>
    </div>
  )
}

function NotesStatus({ message, tone = 'muted' }: { message: string; tone?: 'muted' | 'error' }) {
  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <p
        className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
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
