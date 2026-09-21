import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'

import type { FileTreeNode } from '../types'

import { NotesTree } from './notes-tree'

const tree: FileTreeNode[] = [
  {
    id: 'v1',
    name: 'Reading',
    path: '/Reading',
    vaultId: 'v1',
    type: 'folder',
    children: [
      {
        id: 'd1',
        name: 'alpha',
        path: '/Reading/alpha.md',
        vaultId: 'v1',
        type: 'document',
        children: [],
      },
      {
        id: '/Reading/notes',
        name: 'notes',
        path: '/Reading/notes',
        vaultId: 'v1',
        type: 'folder',
        children: [
          {
            id: 'd2',
            name: 'beta',
            path: '/Reading/notes/beta.md',
            vaultId: 'v1',
            type: 'document',
            children: [],
          },
        ],
      },
    ],
  },
]

type RenderTreeOptions = {
  activeDocumentId?: string
  selectedFolderPath?: string | null
  onRename?: (node: FileTreeNode, name: string) => Promise<void>
  onDelete?: (node: FileTreeNode) => Promise<void>
}

function renderTree({
  activeDocumentId,
  selectedFolderPath = null,
  onRename = vi.fn(),
  onDelete = vi.fn(),
}: RenderTreeOptions = {}) {
  return render(
    <SidebarProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path='/'
            element={
              <NotesTree
                activeDocumentId={activeDocumentId}
                forceExpandedPaths={new Set()}
                nodes={tree}
                onDelete={onDelete}
                onRename={onRename}
                onSelectFolder={vi.fn()}
                selectedFolderPath={selectedFolderPath}
              />
            }
          />
          <Route
            path='/notes/:documentId'
            element={<div>Document view</div>}
          />
        </Routes>
      </MemoryRouter>
    </SidebarProvider>,
  )
}

describe('NotesTree', () => {
  it('renders the vault, folders and documents', () => {
    renderTree()

    expect(screen.getByText('Reading')).toBeInTheDocument()
    expect(screen.getByText('notes')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'alpha' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'beta' })).toBeInTheDocument()
  })

  it('navigates to a document when clicked', () => {
    renderTree()

    fireEvent.click(screen.getByRole('link', { name: 'alpha' }))

    expect(screen.getByText('Document view')).toBeInTheDocument()
  })

  it('collapses and expands folders', () => {
    renderTree()

    fireEvent.click(screen.getByRole('button', { name: 'notes' }))
    expect(screen.queryByRole('link', { name: 'beta' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'notes' }))
    expect(screen.getByRole('link', { name: 'beta' })).toBeInTheDocument()
  })

  it('marks the active document', () => {
    renderTree({ activeDocumentId: 'd1' })

    expect(screen.getByRole('link', { name: 'alpha' })).toHaveAttribute('data-active')
  })

  it('opens a context menu with rename and delete on right click', () => {
    renderTree()

    fireEvent.contextMenu(screen.getByRole('link', { name: 'alpha' }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('renames a document from the context menu', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)
    renderTree({ onRename })

    fireEvent.contextMenu(screen.getByRole('link', { name: 'alpha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    const input = screen.getByLabelText('Note name')
    fireEvent.change(input, { target: { value: 'renamed' } })
    fireEvent.submit(input)

    await waitFor(() => expect(onRename).toHaveBeenCalledTimes(1))
    expect(onRename.mock.calls[0]?.[1]).toBe('renamed')
  })

  it('deletes a document from the context menu', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    renderTree({ onDelete })

    fireEvent.contextMenu(screen.getByRole('link', { name: 'alpha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
  })

  it('does not open the context menu for vault roots', () => {
    renderTree()

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reading' }))

    expect(screen.queryByRole('menu')).toBeNull()
  })
})
