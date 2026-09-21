import { useEffect, useMemo, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router'

import type { Document } from '@/lib/types'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'

import type { FileTreeNode } from './types'

import { InlineNameForm } from './components/inline-name-form'
import { NotesNewMenu, type NewAction } from './components/notes-new-menu'
import { NotesTree } from './components/notes-tree'
import {
  collectDocumentPaths,
  collectDocuments,
  collectFolderPaths,
  filterTree,
  isVaultRoot,
  parentPath,
  resolveCreateScope,
} from './lib/file-tree'
import { useNotesWorkspaceContext } from './notes-workspace-context'

type PendingAction = 'folder' | 'vault' | null

function toMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong'
}

/**
 * Resolves the creation scope for a node picked through the right-click menu:
 * a folder creates inside itself, a document creates next to it.
 */
function createScopeFor(node: FileTreeNode) {
  return {
    vaultId: node.vaultId,
    basePath: node.type === 'folder' ? node.path : parentPath(node.path),
  }
}

export function NotesSidebar() {
  const {
    tree,
    vaults,
    documentsById,
    isLoading,
    error,
    createNote,
    createFolder,
    createVault,
    renameVault,
    deleteVault,
    renameNode,
    moveNode,
    deleteNode,
  } = useNotesWorkspaceContext()
  const match = useMatch('/notes/:documentId')
  const activeDocumentId = match?.params.documentId
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [vaultPendingDelete, setVaultPendingDelete] = useState<FileTreeNode | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const activeDocument: Document | undefined =
    activeDocumentId === undefined ? undefined : documentsById.get(activeDocumentId)
  const scope = useMemo(
    () => resolveCreateScope(tree, vaults, selectedFolderPath, activeDocument),
    [tree, vaults, selectedFolderPath, activeDocument],
  )

  const filteredTree = useMemo(() => filterTree(tree, query), [tree, query])
  // Only force-expand every folder while searching; otherwise folders keep their
  // own collapse state (an empty query returns the whole tree, which would
  // otherwise mark every folder as force-expanded).
  const forceExpandedPaths = useMemo(
    () => (query.trim() === '' ? new Set<string>() : new Set(collectFolderPaths(filteredTree))),
    [filteredTree, query],
  )

  const handleCreateNote = async () => {
    if (scope === null) {
      return
    }
    setActionError(null)
    try {
      const document = await createNote(scope)
      void navigate(`/notes/${document.id}`)
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const handleSelectAction = (action: NewAction) => {
    setActionError(null)
    if (action === 'note') {
      void handleCreateNote()
      return
    }
    setPendingAction(action)
  }

  const handleSubmitName = async (name: string) => {
    setIsSubmitting(true)
    setActionError(null)
    try {
      let document: Document
      if (pendingAction === 'vault') {
        document = await createVault(name)
      } else if (pendingAction === 'folder' && scope !== null) {
        document = await createFolder({ vaultId: scope.vaultId, basePath: scope.basePath, name })
      } else {
        setIsSubmitting(false)
        return
      }
      setPendingAction(null)
      setIsSubmitting(false)
      void navigate(`/notes/${document.id}`)
    } catch (cause) {
      setActionError(toMessage(cause))
      setIsSubmitting(false)
    }
  }

  const cancelForm = () => {
    setPendingAction(null)
    setActionError(null)
  }

  const handleCreateNoteAt = async (node: FileTreeNode) => {
    setActionError(null)
    try {
      const document = await createNote(createScopeFor(node))
      void navigate(`/notes/${document.id}`)
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const handleCreateFolderAt = async (node: FileTreeNode, name: string) => {
    const document = await createFolder({ ...createScopeFor(node), name })
    void navigate(`/notes/${document.id}`)
  }

  const isAffectedSelection = (node: FileTreeNode): boolean =>
    selectedFolderPath !== null &&
    (selectedFolderPath === node.path || selectedFolderPath.startsWith(`${node.path}/`))

  const handleRename = async (node: FileTreeNode, name: string) => {
    setActionError(null)
    if (isVaultRoot(node)) {
      await renameVault(node.vaultId, name)
    } else {
      await renameNode(node, name)
    }
    if (isAffectedSelection(node)) {
      setSelectedFolderPath(null)
    }
  }

  const handleMove = async (node: FileTreeNode, targetFolderPath: string) => {
    setActionError(null)
    try {
      await moveNode(node, targetFolderPath)
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const handleDelete = async (node: FileTreeNode) => {
    // Vault deletion is permanent (no trash), so it asks for confirmation first.
    if (isVaultRoot(node)) {
      setVaultPendingDelete(node)
      return
    }
    setActionError(null)
    try {
      const deletedActiveDocument =
        activeDocumentId !== undefined &&
        collectDocuments(node).some((document) => document.id === activeDocumentId)
      await deleteNode(node)
      if (isAffectedSelection(node)) {
        setSelectedFolderPath(null)
      }
      if (deletedActiveDocument) {
        void navigate('/')
      }
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const handleConfirmDeleteVault = async () => {
    const node = vaultPendingDelete
    if (node === null) {
      return
    }
    setVaultPendingDelete(null)
    setActionError(null)
    try {
      const deletedActiveDocument =
        activeDocumentId !== undefined &&
        collectDocuments(node).some((document) => document.id === activeDocumentId)
      await deleteVault(node.vaultId)
      if (isAffectedSelection(node)) {
        setSelectedFolderPath(null)
      }
      if (deletedActiveDocument) {
        void navigate('/')
      }
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const hasVaults = vaults.length > 0
  const hasDocuments = collectDocumentPaths(tree).size > 0
  const hasFilteredDocuments = collectDocumentPaths(filteredTree).size > 0
  const showTree = !isLoading && error === null && hasFilteredDocuments
  const showNoNotes = !isLoading && error === null && hasVaults && !hasDocuments
  const showNoResults =
    !isLoading && error === null && hasVaults && hasDocuments && !hasFilteredDocuments

  return (
    <SidebarGroup className='p-2'>
      <div className='sticky top-0 z-10 flex flex-col gap-2 bg-sidebar pb-3 group-data-[collapsible=icon]:hidden'>
        <div className='flex items-center gap-1'>
          <SidebarInput
            ref={searchRef}
            aria-label='Search notes'
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setQuery('')
              }
            }}
            placeholder='Search notes'
            value={query}
          />
          <NotesNewMenu
            canCreateScoped={scope !== null}
            onSelect={handleSelectAction}
          />
        </div>
        {pendingAction === 'folder' && (
          <InlineNameForm
            error={actionError}
            isBusy={isSubmitting}
            label='Folder name'
            onCancel={cancelForm}
            onSubmit={(name) => {
              void handleSubmitName(name)
            }}
            placeholder='Folder name'
            submitLabel='Create folder'
          />
        )}
        {pendingAction === 'vault' && (
          <InlineNameForm
            error={actionError}
            isBusy={isSubmitting}
            label='Vault name'
            onCancel={cancelForm}
            onSubmit={(name) => {
              void handleSubmitName(name)
            }}
            placeholder='Vault name'
            submitLabel='Create vault'
          />
        )}
        {actionError !== null && pendingAction === null && (
          <p className='text-xs text-destructive'>{actionError}</p>
        )}
      </div>

      <SidebarGroupLabel className='mb-1'>Notes</SidebarGroupLabel>

      <SidebarGroupContent className='group-data-[collapsible=icon]:hidden'>
        {isLoading && (
          <div className='flex flex-col gap-1 py-1'>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </div>
        )}

        {error !== null && <p className='px-2 py-1 text-sm text-destructive'>{error.message}</p>}

        {!isLoading && error === null && !hasVaults && (
          <div className='flex flex-col items-start gap-2 px-2 py-1'>
            <p className='text-sm text-muted-foreground'>No vaults yet.</p>
            <Button
              onClick={() => {
                setPendingAction('vault')
              }}
              size='xs'
            >
              New vault
            </Button>
          </div>
        )}

        {showNoNotes && <p className='px-2 py-1 text-sm text-muted-foreground'>No notes yet.</p>}

        {showNoResults && (
          <p className='px-2 py-1 text-sm text-muted-foreground'>No notes found.</p>
        )}

        {showTree && (
          <NotesTree
            activeDocumentId={activeDocumentId}
            forceExpandedPaths={forceExpandedPaths}
            nodes={filteredTree}
            onCreateFolder={handleCreateFolderAt}
            onCreateNote={handleCreateNoteAt}
            onDelete={handleDelete}
            onMove={handleMove}
            onRename={handleRename}
            onSelectFolder={setSelectedFolderPath}
            selectedFolderPath={selectedFolderPath}
          />
        )}
      </SidebarGroupContent>

      <AlertDialog
        open={vaultPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVaultPendingDelete(null)
          }
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle>Delete vault?</AlertDialogTitle>
          <AlertDialogDescription>
            {`"${vaultPendingDelete?.name ?? ''}" and all of its documents will be permanently deleted. This cannot be undone.`}
          </AlertDialogDescription>
          <div className='flex justify-end gap-2'>
            <AlertDialogClose
              render={
                <Button
                  variant='ghost'
                  size='sm'
                />
              }
            >
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              render={
                <Button
                  variant='destructive'
                  size='sm'
                />
              }
              onClick={() => {
                void handleConfirmDeleteVault()
              }}
            >
              Delete vault
            </AlertDialogClose>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </SidebarGroup>
  )
}
