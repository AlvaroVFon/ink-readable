import { useState, type FormEvent } from 'react'

import type { Task, TaskStatus } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { TaskStatusSelect } from './task-status-select'

export type TaskDialogSubmit = {
  title: string
  description: string
  status: TaskStatus
}

type TaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Task being edited; `null` creates a new one. */
  task: Task | null
  defaultStatus?: TaskStatus
  onSubmit: (input: TaskDialogSubmit) => Promise<void>
}

/**
 * Modal used both to create and edit a task: title, description and a status
 * dropdown. The form lives inside the popup, so it remounts (and resets) every
 * time the dialog opens.
 */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus = 'backlog',
  onSubmit,
}: TaskDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogPopup>
        <DialogTitle>{task === null ? 'New task' : 'Edit task'}</DialogTitle>
        <TaskForm
          defaultStatus={defaultStatus}
          onCancel={() => {
            onOpenChange(false)
          }}
          onSubmit={onSubmit}
          task={task}
        />
      </DialogPopup>
    </Dialog>
  )
}

type TaskFormProps = {
  task: Task | null
  defaultStatus: TaskStatus
  onSubmit: (input: TaskDialogSubmit) => Promise<void>
  onCancel: () => void
}

function TaskForm({ task, defaultStatus, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = title.trim()

  const submit = async () => {
    if (trimmed === '' || isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({ title: trimmed, description, status })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit()
  }

  return (
    <form
      className='flex flex-col gap-3'
      onSubmit={handleSubmit}
    >
      <label className='flex flex-col gap-1.5'>
        <span className='text-xs font-medium text-muted-foreground'>Title</span>
        <Input
          autoFocus
          disabled={isSubmitting}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          placeholder='Task title'
          value={title}
        />
      </label>

      <label className='flex flex-col gap-1.5'>
        <span className='text-xs font-medium text-muted-foreground'>Description</span>
        <Textarea
          disabled={isSubmitting}
          onChange={(event) => {
            setDescription(event.target.value)
          }}
          placeholder='Add more detail…'
          rows={4}
          value={description}
        />
      </label>

      <div className='flex flex-col gap-1.5'>
        <span className='text-xs font-medium text-muted-foreground'>Status</span>
        <TaskStatusSelect
          disabled={isSubmitting}
          onChange={setStatus}
          value={status}
        />
      </div>

      {error !== null && <p className='text-xs text-destructive'>{error}</p>}

      <div className='flex justify-end gap-2'>
        <DialogClose
          render={
            <Button
              onClick={onCancel}
              type='button'
              variant='ghost'
            />
          }
        >
          Cancel
        </DialogClose>
        <Button
          disabled={isSubmitting || trimmed === ''}
          type='submit'
        >
          {task === null ? 'Create task' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
