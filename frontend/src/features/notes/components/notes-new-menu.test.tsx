import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NotesNewMenu } from './notes-new-menu'

describe('NotesNewMenu', () => {
  it('stacks the positioner above the sidebar', () => {
    render(
      <NotesNewMenu
        canCreateScoped
        onSelect={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create new' }))

    expect(screen.getByRole('menu').parentElement).toHaveClass('z-50')
  })

  it('reports the selected action', () => {
    const onSelect = vi.fn()
    render(
      <NotesNewMenu
        canCreateScoped
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create new' }))
    fireEvent.click(screen.getByText('New note'))

    expect(onSelect).toHaveBeenCalledWith('note')
  })

  it('disables scoped actions when there is no vault', () => {
    render(
      <NotesNewMenu
        canCreateScoped={false}
        onSelect={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create new' }))

    expect(screen.getByText('New note')).toHaveAttribute('data-disabled')
    expect(screen.getByText('New folder')).toHaveAttribute('data-disabled')
    expect(screen.getByText('New vault')).not.toHaveAttribute('data-disabled')
  })
})
