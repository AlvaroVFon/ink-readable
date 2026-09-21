import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'
import type { Document } from '@/lib/types'

const { useEditorConfigContext } = vi.hoisted(() => ({ useEditorConfigContext: vi.fn() }))

vi.mock('@/components/editor-config/editor-config-context', () => ({ useEditorConfigContext }))

vi.mock('@/lib/api', () => ({
  updateDocumentContent: vi.fn().mockResolvedValue(undefined),
}))

import { NotesEditor } from './notes-editor'

const document: Document = {
  id: 'doc-1',
  name: 'Note',
  vaultId: 'vault-1',
  path: '/Note',
  content: '# Hello world',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

function setup() {
  useEditorConfigContext.mockReturnValue({
    config: { id: 'default', darkTheme: true, vimMotion: false },
    isLoading: false,
    error: null,
    updateDarkTheme: vi.fn(),
    updateVimMotion: vi.fn(),
    reload: vi.fn(),
  } satisfies UseEditorConfigResult)

  return render(<NotesEditor document={document} />)
}

describe('NotesEditor view modes', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
  })

  it('keeps the CodeMirror editor mounted when switching to preview and back', () => {
    const { container } = setup()
    expect(container.querySelector('.cm-editor')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Preview only' }))
    expect(container.querySelector('.cm-editor')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Editor only' }))
    expect(container.querySelector('.cm-editor')).not.toBeNull()
  })

  it('renders the preview after switching from editor to preview', () => {
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Editor only' }))
    fireEvent.click(screen.getByRole('button', { name: 'Preview only' }))

    expect(screen.getByRole('heading', { name: 'Hello world' })).toBeInTheDocument()
  })
})
