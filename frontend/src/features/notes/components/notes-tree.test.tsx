import { fireEvent, render, screen } from '@testing-library/react'
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
}

function renderTree({ activeDocumentId, selectedFolderPath = null }: RenderTreeOptions = {}) {
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
})
