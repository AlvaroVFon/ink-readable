import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'

import type { FileTreeNode } from '../types'

import { NotesVimProvider } from '../notes-vim-context'
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

const crossVaultTree: FileTreeNode[] = [
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
    ],
  },
  {
    id: 'v2',
    name: 'Work',
    path: '/Work',
    vaultId: 'v2',
    type: 'folder',
    children: [
      {
        id: 'd9',
        name: 'spec',
        path: '/Work/spec.md',
        vaultId: 'v2',
        type: 'document',
        children: [],
      },
    ],
  },
]

function createDataTransfer() {
  return { dropEffect: '', effectAllowed: '', setData: vi.fn() }
}

function focusTree(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('div[tabindex="-1"]')
  if (root === null) {
    throw new Error('tree root not found')
  }
  root.focus()
  return root
}

type RenderTreeOptions = {
  activeDocumentId?: string
  selectedFolderPath?: string | null
  nodes?: FileTreeNode[]
  onRename?: (node: FileTreeNode, name: string) => Promise<void>
  onDelete?: (node: FileTreeNode) => Promise<void>
  onCreateNote?: (node: FileTreeNode) => Promise<void>
  onCreateNamedNote?: (node: FileTreeNode, name: string) => Promise<void>
  onCreateFolder?: (node: FileTreeNode, name: string) => Promise<void>
  onMove?: (node: FileTreeNode, targetFolderPath: string) => Promise<void>
}

function renderTree({
  activeDocumentId,
  selectedFolderPath = null,
  nodes = tree,
  onRename = vi.fn(),
  onDelete = vi.fn(),
  onCreateNote = vi.fn(),
  onCreateNamedNote = vi.fn(),
  onCreateFolder = vi.fn(),
  onMove = vi.fn(),
}: RenderTreeOptions = {}) {
  return render(
    <NotesVimProvider>
      <SidebarProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path='/'
              element={
                <NotesTree
                  activeDocumentId={activeDocumentId}
                  forceExpandedPaths={new Set()}
                  nodes={nodes}
                  onCreateFolder={onCreateFolder}
                  onCreateNamedNote={onCreateNamedNote}
                  onCreateNote={onCreateNote}
                  onDelete={onDelete}
                  onMove={onMove}
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
      </SidebarProvider>
    </NotesVimProvider>,
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

  it('renders vault roots with a database icon instead of a folder', () => {
    renderTree()

    const vault = screen.getByRole('button', { name: 'Reading' })

    expect(vault.querySelector('.lucide-database')).not.toBeNull()
    expect(vault.querySelector('.lucide-folder, .lucide-folder-open')).toBeNull()
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

  it('opens a context menu with create, rename and delete on right click', () => {
    renderTree()

    fireEvent.contextMenu(screen.getByRole('link', { name: 'alpha' }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('creates a sibling note from a document context menu', async () => {
    const onCreateNote = vi.fn().mockResolvedValue(undefined)
    renderTree({ onCreateNote })

    fireEvent.contextMenu(screen.getByRole('link', { name: 'alpha' }))
    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    await waitFor(() => expect(onCreateNote).toHaveBeenCalledTimes(1))
    expect(onCreateNote.mock.calls[0]?.[0]).toMatchObject({ path: '/Reading/alpha.md' })
  })

  it('shows an inline field and creates a folder from the context menu', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(undefined)
    renderTree({ onCreateFolder })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'notes' }))
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

    const input = screen.getByLabelText('New folder name')
    fireEvent.change(input, { target: { value: 'ideas' } })
    fireEvent.submit(input)

    await waitFor(() => expect(onCreateFolder).toHaveBeenCalledTimes(1))
    expect(onCreateFolder.mock.calls[0]?.[0]).toMatchObject({ path: '/Reading/notes' })
    expect(onCreateFolder.mock.calls[0]?.[1]).toBe('ideas')
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

  it('offers creation, rename and delete for vault roots', () => {
    renderTree()

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reading' }))

    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('renames a vault with a vault-labelled inline field', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)
    renderTree({ onRename })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reading' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    const input = screen.getByLabelText('Vault name')
    fireEvent.change(input, { target: { value: 'Archive' } })
    fireEvent.submit(input)

    await waitFor(() => expect(onRename).toHaveBeenCalledTimes(1))
    expect(onRename.mock.calls[0]?.[1]).toBe('Archive')
  })

  it('moves a document into another folder on drop', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined)
    renderTree({ onMove })

    const source = screen.getByRole('link', { name: 'alpha' })
    const target = screen.getByRole('button', { name: 'notes' })

    fireEvent.dragStart(source, { dataTransfer: createDataTransfer() })
    fireEvent.dragOver(target, { dataTransfer: createDataTransfer() })
    fireEvent.drop(target, { dataTransfer: createDataTransfer() })

    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1))
    expect(onMove.mock.calls[0]?.[0]).toMatchObject({ id: 'd1' })
    expect(onMove.mock.calls[0]?.[1]).toBe('/Reading/notes')
  })

  it('does not move a document into its current folder', () => {
    const onMove = vi.fn()
    renderTree({ onMove })

    const source = screen.getByRole('link', { name: 'alpha' })
    const vault = screen.getByRole('button', { name: 'Reading' })

    fireEvent.dragStart(source, { dataTransfer: createDataTransfer() })
    fireEvent.dragOver(vault, { dataTransfer: createDataTransfer() })
    fireEvent.drop(vault, { dataTransfer: createDataTransfer() })

    expect(onMove).not.toHaveBeenCalled()
  })

  it('does not move a document across vaults', () => {
    const onMove = vi.fn()
    renderTree({ nodes: crossVaultTree, onMove })

    const source = screen.getByRole('link', { name: 'alpha' })
    const target = screen.getByRole('button', { name: 'Work' })

    fireEvent.dragStart(source, { dataTransfer: createDataTransfer() })
    fireEvent.dragOver(target, { dataTransfer: createDataTransfer() })
    fireEvent.drop(target, { dataTransfer: createDataTransfer() })

    expect(onMove).not.toHaveBeenCalled()
  })
})

describe('NotesTree keyboard navigation', () => {
  it('moves the cursor with j and opens a document with l', () => {
    const { container } = renderTree()
    const root = focusTree(container)

    fireEvent.keyDown(root, { key: 'j' })
    expect(screen.getByRole('link', { name: 'alpha' })).toHaveAttribute('data-cursor')

    fireEvent.keyDown(root, { key: 'l' })
    expect(screen.getByText('Document view')).toBeInTheDocument()
  })

  it('collapses and expands folders with h and l', () => {
    const { container } = renderTree()
    const root = focusTree(container)

    expect(screen.getByRole('link', { name: 'alpha' })).toBeInTheDocument()

    fireEvent.keyDown(root, { key: 'h' })
    expect(screen.queryByRole('link', { name: 'alpha' })).toBeNull()

    fireEvent.keyDown(root, { key: 'l' })
    expect(screen.getByRole('link', { name: 'alpha' })).toBeInTheDocument()
  })

  it('jumps to the last row with G', () => {
    const { container } = renderTree()
    const root = focusTree(container)

    fireEvent.keyDown(root, { key: 'G' })

    expect(screen.getByRole('link', { name: 'beta' })).toHaveAttribute('data-cursor')
  })

  it('creates a named note with a and an inline field', async () => {
    const onCreateNamedNote = vi.fn().mockResolvedValue(undefined)
    const { container } = renderTree({ onCreateNamedNote })
    const root = focusTree(container)

    fireEvent.keyDown(root, { key: 'j' })
    fireEvent.keyDown(root, { key: 'a' })

    const input = screen.getByLabelText('New note name')
    fireEvent.change(input, { target: { value: 'ideas' } })
    fireEvent.submit(input)

    await waitFor(() => expect(onCreateNamedNote).toHaveBeenCalledTimes(1))
    expect(onCreateNamedNote.mock.calls[0]?.[0]).toMatchObject({ path: '/Reading' })
    expect(onCreateNamedNote.mock.calls[0]?.[1]).toBe('ideas')
  })

  it('creates a folder when the name ends with a slash', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(undefined)
    const { container } = renderTree({ onCreateFolder })
    const root = focusTree(container)

    fireEvent.keyDown(root, { key: 'j' })
    fireEvent.keyDown(root, { key: 'a' })

    const input = screen.getByLabelText('New note name')
    fireEvent.change(input, { target: { value: 'ideas/' } })
    fireEvent.submit(input)

    await waitFor(() => expect(onCreateFolder).toHaveBeenCalledTimes(1))
    expect(onCreateFolder.mock.calls[0]?.[1]).toBe('ideas')
  })

  it('renames the cursor node with r', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)
    const { container } = renderTree({ onRename })
    const root = focusTree(container)

    fireEvent.keyDown(root, { key: 'j' })
    fireEvent.keyDown(root, { key: 'r' })

    const input = screen.getByLabelText('Note name')
    fireEvent.change(input, { target: { value: 'renamed' } })
    fireEvent.submit(input)

    await waitFor(() => expect(onRename).toHaveBeenCalledTimes(1))
    expect(onRename.mock.calls[0]?.[1]).toBe('renamed')
  })

  it('deletes the cursor node with d', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const { container } = renderTree({ onDelete })
    const root = focusTree(container)

    fireEvent.keyDown(root, { key: 'j' })
    fireEvent.keyDown(root, { key: 'd' })

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
    expect(onDelete.mock.calls[0]?.[0]).toMatchObject({ path: '/Reading/alpha.md' })
  })
})
