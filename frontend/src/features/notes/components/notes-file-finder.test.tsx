import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Document } from '@/lib/types'

const { useNotesVimContext, useNotesWorkspaceContext } = vi.hoisted(() => ({
  useNotesVimContext: vi.fn(),
  useNotesWorkspaceContext: vi.fn(),
}))

vi.mock('../notes-vim-context', () => ({ useNotesVimContext }))
vi.mock('../notes-workspace-context', () => ({ useNotesWorkspaceContext }))

import { NotesFileFinder } from './notes-file-finder'

const alpha: Document = {
  id: 'd1',
  name: 'alpha',
  vaultId: 'v1',
  path: '/Reading/alpha.md',
  content: '',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

const beta: Document = {
  id: 'd2',
  name: 'beta',
  vaultId: 'v2',
  path: '/Work/beta.md',
  content: '',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

function DocView() {
  const { documentId } = useParams()
  return <div>{`doc view ${documentId ?? ''}`}</div>
}

function setup(finderOpen = true) {
  const closeFinder = vi.fn()
  const toggleFinder = vi.fn()

  useNotesVimContext.mockReturnValue({
    focus: 'editor',
    finderOpen,
    editorFocusRef: { current: null },
    focusEditor: vi.fn(),
    focusSidebar: vi.fn(),
    openFinder: vi.fn(),
    closeFinder,
    toggleFinder,
  })
  useNotesWorkspaceContext.mockReturnValue({
    documentsById: new Map([
      [alpha.id, alpha],
      [beta.id, beta],
    ]),
  })

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path='/'
          element={null}
        />
        <Route
          path='/notes/:documentId'
          element={<DocView />}
        />
      </Routes>
      <NotesFileFinder />
    </MemoryRouter>,
  )

  return { closeFinder, toggleFinder }
}

describe('NotesFileFinder', () => {
  beforeEach(() => {
    useNotesVimContext.mockReset()
    useNotesWorkspaceContext.mockReset()
  })

  it('lists every document across vaults', () => {
    setup()

    expect(screen.getByRole('button', { name: /alpha/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /beta/ })).toBeInTheDocument()
  })

  it('filters results by name and path', () => {
    setup()

    fireEvent.change(screen.getByLabelText('Find file'), { target: { value: 'work' } })

    expect(screen.queryByRole('button', { name: /alpha/ })).toBeNull()
    expect(screen.getByRole('button', { name: /beta/ })).toBeInTheDocument()
  })

  it('shows an empty message when nothing matches', () => {
    setup()

    fireEvent.change(screen.getByLabelText('Find file'), { target: { value: 'zzz' } })

    expect(screen.getByText('No files found.')).toBeInTheDocument()
  })

  it('opens the selected document with Enter', async () => {
    const { closeFinder } = setup()

    const input = screen.getByLabelText('Find file')
    fireEvent.change(input, { target: { value: 'beta' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText('doc view d2')).toBeInTheDocument())
    expect(closeFinder).toHaveBeenCalled()
  })

  it('moves the selection with the arrow keys', async () => {
    setup()

    const input = screen.getByLabelText('Find file')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText('doc view d2')).toBeInTheDocument())
  })

  it('toggles the finder on Ctrl+P', () => {
    const { toggleFinder } = setup(false)

    fireEvent.keyDown(window, { ctrlKey: true, key: 'p' })

    expect(toggleFinder).toHaveBeenCalledTimes(1)
  })
})
