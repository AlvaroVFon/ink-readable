import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Task } from '@/lib/types'

import { TaskDialog } from './task-dialog'

const task: Task = {
  id: 't1',
  projectId: 'p1',
  title: 'Design the board',
  description: 'Sketch it',
  status: 'todo',
  position: 1,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

describe('TaskDialog', () => {
  it('creates a task with title, description and status', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskDialog
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open
        task={null}
      />,
    )

    expect(screen.getByText('New task')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: '  Write tests  ' },
    })
    fireEvent.change(screen.getByPlaceholderText('Add more detail…'), {
      target: { value: 'Cover the board' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Backlog' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'In progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Write tests',
        description: 'Cover the board',
        status: 'in_progress',
      })
    })
  })

  it('disables submit while the title is empty', () => {
    render(
      <TaskDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        open
        task={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Create task' })).toBeDisabled()
  })

  it('prefills the form when editing', () => {
    render(
      <TaskDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        open
        task={task}
      />,
    )

    expect(screen.getByText('Edit task')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Task title')).toHaveValue('Design the board')
    expect(screen.getByPlaceholderText('Add more detail…')).toHaveValue('Sketch it')
    expect(screen.getByRole('button', { name: 'Todo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('shows the error when the submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'))
    render(
      <TaskDialog
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open
        task={null}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: 'Write tests' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }))

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
