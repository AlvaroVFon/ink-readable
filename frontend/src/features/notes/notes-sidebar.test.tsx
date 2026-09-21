import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Document, Vault } from '@/lib/types'

import { SidebarProvider } from '@/components/ui/sidebar'

import type { UseNotesWorkspaceResult } from './hooks/use-notes-workspace'
import type { FileTreeNode } from './types'

import { NotesSidebar } from './notes-sidebar'

const { useNotesWorkspaceContext } = vi.hoisted(() => ({ useNotesWorkspaceContext: vi.fn() }))

vi.mock('./notes-workspace-context', () => ({ useNotesWorkspaceContext }))

const reading: Vault = { id: 'v1', name: 'Reading', deleted: false, createdAt: '', updatedAt: '' }

const document: Document = {
  id: 'd2',
  name: 'Untitled',
  vaultId: 'v1',
  path: '/Reading/notes/Untitled.md',
  content: '',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

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
        id: 'd2',
        name: 'beta',
        path: '/Reading/beta.md',
        vaultId: 'v1',
        type: 'document',
        children: [],
      },
    ],
  },
]

type WorkspaceOverrides = Partial<UseNotesWorkspaceResult>

function mockWorkspace(overrides: WorkspaceOverrides = {}) {
  useNotesWorkspaceContext.mockReturnValue({
    tree,
    vaults: [reading],
    documentsById: new Map(),
    isLoading: false,
    error: null,
    revision: 0,
    refresh: vi.fn(),
    createNote: vi.fn(),
    createFolder: vi.fn(),
    createVault: vi.fn(),
    renameVault: vi.fn(),
    deleteVault: vi.fn(),
    renameNode: vi.fn(),
    moveNode: vi.fn(),
    deleteNode: vi.fn(),
    ...overrides,
  })
}

function renderSidebar() {
  return render(
    <SidebarProvider>
      <MemoryRouter initialEntries={['/']}>
        <NotesSidebar />
      </MemoryRouter>
    </SidebarProvider>,
  )
}

describe('NotesSidebar', () => {
  beforeEach(() => {
    useNotesWorkspaceContext.mockReset()
  })

  it('renders the documents tree', () => {
    mockWorkspace()

    renderSidebar()

    expect(screen.getByRole('link', { name: 'alpha' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'beta' })).toBeInTheDocument()
  })

  it('filters the tree with the search input', () => {
    mockWorkspace()

    renderSidebar()

    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'beta' } })

    expect(screen.queryByRole('link', { name: 'alpha' })).toBeNull()
    expect(screen.getByRole('link', { name: 'beta' })).toBeInTheDocument()
  })

  it('collapses folders when there is no search query', () => {
    mockWorkspace({
      tree: [
        {
          id: 'v1',
          name: 'Reading',
          path: '/Reading',
          vaultId: 'v1',
          type: 'folder',
          children: [
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
      ],
    })

    renderSidebar()

    expect(screen.getByRole('link', { name: 'beta' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'notes' }))

    expect(screen.queryByRole('link', { name: 'beta' })).toBeNull()
  })

  it('keeps ancestors expanded while searching', () => {
    mockWorkspace({
      tree: [
        {
          id: 'v1',
          name: 'Reading',
          path: '/Reading',
          vaultId: 'v1',
          type: 'folder',
          children: [
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
      ],
    })

    renderSidebar()

    fireEvent.click(screen.getByRole('button', { name: 'notes' }))
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'beta' } })

    expect(screen.getByRole('link', { name: 'beta' })).toBeInTheDocument()
  })

  it('creates a sibling note from the context menu', async () => {
    const createNote = vi.fn().mockResolvedValue(document)
    mockWorkspace({ createNote })

    renderSidebar()

    fireEvent.contextMenu(screen.getByRole('link', { name: 'alpha' }))
    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith({ vaultId: 'v1', basePath: '/Reading' }),
    )
  })

  it('creates a folder from the vault root context menu', async () => {
    const createFolder = vi.fn().mockResolvedValue(document)
    mockWorkspace({ createFolder })

    renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reading' }))
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

    const input = screen.getByLabelText('New folder name')
    fireEvent.change(input, { target: { value: 'Work' } })
    fireEvent.submit(input)

    await waitFor(() =>
      expect(createFolder).toHaveBeenCalledWith({
        vaultId: 'v1',
        basePath: '/Reading',
        name: 'Work',
      }),
    )
  })

  it('renames a vault from the context menu', async () => {
    const renameVault = vi.fn().mockResolvedValue(undefined)
    mockWorkspace({ renameVault })

    renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reading' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    const input = screen.getByLabelText('Vault name')
    fireEvent.change(input, { target: { value: 'Archive' } })
    fireEvent.submit(input)

    await waitFor(() => expect(renameVault).toHaveBeenCalledWith('v1', 'Archive'))
  })

  it('asks for confirmation before deleting a vault', async () => {
    const deleteVault = vi.fn().mockResolvedValue(undefined)
    const deleteNode = vi.fn().mockResolvedValue(undefined)
    mockWorkspace({ deleteVault, deleteNode })

    renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reading' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.getByText('Delete vault?')).toBeInTheDocument()
    expect(deleteVault).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete vault' }))

    await waitFor(() => expect(deleteVault).toHaveBeenCalledWith('v1'))
    expect(deleteNode).not.toHaveBeenCalled()
  })

  it('moves a document into a folder on drop', async () => {
    const moveNode = vi.fn().mockResolvedValue(undefined)
    mockWorkspace({
      moveNode,
      tree: [
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
              children: [],
            },
          ],
        },
      ],
    })

    renderSidebar()

    fireEvent.dragStart(screen.getByRole('link', { name: 'alpha' }))
    fireEvent.dragOver(screen.getByRole('button', { name: 'notes' }))
    fireEvent.drop(screen.getByRole('button', { name: 'notes' }))

    await waitFor(() => expect(moveNode).toHaveBeenCalledTimes(1))
    expect(moveNode.mock.calls[0]?.[1]).toBe('/Reading/notes')
  })

  it('focuses the search input with Ctrl+K', () => {
    mockWorkspace()

    renderSidebar()

    fireEvent.keyDown(window, { ctrlKey: true, key: 'k' })

    expect(screen.getByLabelText('Search notes')).toHaveFocus()
  })

  it('shows a vault call to action when there are no vaults', () => {
    mockWorkspace({ vaults: [], tree: [] })

    renderSidebar()

    expect(screen.getByText('No vaults yet.')).toBeInTheDocument()
  })

  it('creates a vault from the empty state', async () => {
    const createVault = vi.fn().mockResolvedValue(document)
    mockWorkspace({ vaults: [], tree: [], createVault })

    renderSidebar()

    fireEvent.click(screen.getByRole('button', { name: 'New vault' }))

    const input = screen.getByLabelText('Vault name')
    fireEvent.change(input, { target: { value: 'Work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create vault' }))

    await waitFor(() => expect(createVault).toHaveBeenCalledWith('Work'))
  })

  it('shows an empty notes message when a vault has no documents', () => {
    mockWorkspace({
      tree: [
        {
          id: 'v1',
          name: 'Reading',
          path: '/Reading',
          vaultId: 'v1',
          type: 'folder',
          children: [],
        },
      ],
    })

    renderSidebar()

    expect(screen.getByText('No notes yet.')).toBeInTheDocument()
  })
})
