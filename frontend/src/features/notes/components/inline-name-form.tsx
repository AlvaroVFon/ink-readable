import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { SidebarInput } from '@/components/ui/sidebar'

type InlineNameFormProps = {
  label: string
  placeholder: string
  submitLabel: string
  isBusy: boolean
  error: string | null
  onSubmit: (name: string) => void
  onCancel: () => void
}

/**
 * Small inline form used to name a new folder or vault. Notes are created
 * directly (Untitled), so this is only for entities that need a name.
 */
export function InlineNameForm({
  label,
  placeholder,
  submitLabel,
  isBusy,
  error,
  onSubmit,
  onCancel,
}: InlineNameFormProps) {
  const [value, setValue] = useState('')
  const trimmed = value.trim()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (trimmed === '' || isBusy) {
      return
    }
    onSubmit(trimmed)
  }

  return (
    <form
      className='flex flex-col gap-2'
      onSubmit={handleSubmit}
    >
      <SidebarInput
        autoFocus
        aria-label={label}
        disabled={isBusy}
        onChange={(event) => {
          setValue(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onCancel()
          }
        }}
        placeholder={placeholder}
        value={value}
      />
      <div className='flex items-center justify-end gap-1'>
        <Button
          onClick={onCancel}
          size='xs'
          type='button'
          variant='ghost'
        >
          Cancel
        </Button>
        <Button
          disabled={isBusy || trimmed === ''}
          size='xs'
          type='submit'
        >
          {submitLabel}
        </Button>
      </div>
      {error !== null && <p className='text-xs text-destructive'>{error}</p>}
    </form>
  )
}
