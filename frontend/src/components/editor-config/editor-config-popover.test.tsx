import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'

const { useEditorConfigContext } = vi.hoisted(() => ({ useEditorConfigContext: vi.fn() }))

vi.mock('./editor-config-context', () => ({ useEditorConfigContext }))

import { EditorConfigPopover } from './editor-config-popover'

function setup(overrides: Partial<UseEditorConfigResult> = {}): UseEditorConfigResult {
  const value: UseEditorConfigResult = {
    config: {
      id: 'default',
      darkTheme: true,
      vimMotion: false,
      formatOnSave: true,
      relativeLineNumbers: false,
    },
    isLoading: false,
    error: null,
    updateDarkTheme: vi.fn().mockResolvedValue(undefined),
    updateVimMotion: vi.fn().mockResolvedValue(undefined),
    updateFormatOnSave: vi.fn().mockResolvedValue(undefined),
    updateRelativeLineNumbers: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
  useEditorConfigContext.mockReturnValue(value)
  return value
}

function openPopover() {
  render(<EditorConfigPopover />)
  fireEvent.click(screen.getByRole('button', { name: 'Editor settings' }))
}

describe('EditorConfigPopover', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
  })

  it('renders the current preferences', () => {
    setup()
    openPopover()

    expect(screen.getByRole('switch', { name: 'Dark theme' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Vim motion' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Format on save' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Relative line numbers' })).not.toBeChecked()
  })

  it('updates the dark theme preference', () => {
    const value = setup()
    openPopover()

    fireEvent.click(screen.getByRole('switch', { name: 'Dark theme' }))

    expect(value.updateDarkTheme).toHaveBeenCalledWith(false)
  })

  it('updates the vim motion preference', () => {
    const value = setup()
    openPopover()

    fireEvent.click(screen.getByRole('switch', { name: 'Vim motion' }))

    expect(value.updateVimMotion).toHaveBeenCalledWith(true)
  })

  it('updates the format on save preference', () => {
    const value = setup()
    openPopover()

    fireEvent.click(screen.getByRole('switch', { name: 'Format on save' }))

    expect(value.updateFormatOnSave).toHaveBeenCalledWith(false)
  })

  it('updates the relative line numbers preference', () => {
    const value = setup()
    openPopover()

    fireEvent.click(screen.getByRole('switch', { name: 'Relative line numbers' }))

    expect(value.updateRelativeLineNumbers).toHaveBeenCalledWith(true)
  })

  it('disables the switches while the config is loading', () => {
    setup({ config: null, isLoading: true })
    openPopover()

    expect(screen.getByRole('switch', { name: 'Dark theme' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('switch', { name: 'Vim motion' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('shows the error message when a request fails', () => {
    setup({ error: new Error('offline') })
    openPopover()

    expect(screen.getByRole('alert')).toHaveTextContent('offline')
  })
})
