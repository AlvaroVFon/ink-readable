import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { SidebarInput } from '@/components/ui/sidebar'

type NewDocumentFormProps = {
  basePath: string
  error: string | null
  onSubmit: (input: string) => Promise<void>
  onCancel: () => void
}

export function NewDocumentForm({
  basePath,
  error,
  onSubmit,
  onCancel,
}: NewDocumentFormProps) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    void onSubmit(value).finally(() => {
      setIsSubmitting(false)
    })
  }

  return (
    <form className='flex flex-col gap-2' onSubmit={handleSubmit}>
      <SidebarInput
        autoFocus
        aria-label='Document name'
        disabled={isSubmitting}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onCancel()
          }
        }}
        placeholder='folder/name'
        value={value}
      />
      <div className='flex items-center justify-between gap-2'>
        <span className='truncate text-xs text-muted-foreground'>{basePath}</span>
        <div className='flex items-center gap-1'>
          <Button onClick={onCancel} size='xs' type='button' variant='ghost'>
            Cancel
          </Button>
          <Button disabled={isSubmitting} size='xs' type='submit'>
            Create
          </Button>
        </div>
      </div>
      {error && <p className='text-xs text-destructive'>{error}</p>}
    </form>
  )
}
