import { useParams } from 'react-router'

import { useDocument } from '@/hooks/use-document'

import { NotesEditor } from './notes-editor'

function NotesPlaceholder() {
  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <section className='flex max-w-md flex-col items-center gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Notes</h1>
        <p className='text-muted-foreground'>Select or create a document to start writing.</p>
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
  const { document, isLoading, error } = useDocument(documentId)

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
