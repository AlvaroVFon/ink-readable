import { ChevronRight, Database, FileText, Folder, FolderOpen } from 'lucide-react'
import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'

import { Input } from '@/components/ui/input'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

import type { FileTreeNode } from '../types'

import { isVaultRoot, parentPath } from '../lib/file-tree'

type NotesTreeProps = {
  nodes: FileTreeNode[]
  activeDocumentId: string | undefined
  selectedFolderPath: string | null
  /** Folders to keep open regardless of local collapse (used while searching). */
  forceExpandedPaths: ReadonlySet<string>
  onSelectFolder: (path: string) => void
  onRename: (node: FileTreeNode, name: string) => Promise<void>
  onDelete: (node: FileTreeNode) => Promise<void>
  onCreateNote: (node: FileTreeNode) => Promise<void>
  onCreateFolder: (node: FileTreeNode, name: string) => Promise<void>
}

type NotesTreeNodeProps = {
  node: FileTreeNode
  depth: number
  activeDocumentId: string | undefined
  selectedFolderPath: string | null
  forceExpandedPaths: ReadonlySet<string>
  collapsedPaths: ReadonlySet<string>
  renamingPath: string | null
  creatingFolderPath: string | null
  onSelectFolder: (path: string) => void
  onRename: (node: FileTreeNode, name: string) => Promise<void>
  onToggle: (path: string) => void
  onContextMenu: (node: FileTreeNode, position: { x: number; y: number }) => void
  onFinishRename: () => void
  onCreateFolder: (node: FileTreeNode, name: string) => Promise<void>
  onFinishCreateFolder: () => void
}

const MENU_ITEM_CLASS =
  'flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'

/**
 * Recursive vault → folder → document tree.
 *
 * Folders keep their own collapse state; while a search is active, their
 * ancestors are force-expanded through `forceExpandedPaths`. Right-clicking a
 * node opens a context menu with creation, rename and delete. Rename happens
 * inline, and a new folder is named through an inline field below its parent.
 */
export function NotesTree({
  nodes,
  activeDocumentId,
  selectedFolderPath,
  forceExpandedPaths,
  onSelectFolder,
  onRename,
  onDelete,
  onCreateNote,
  onCreateFolder,
}: NotesTreeProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(new Set())
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [creatingFolderPath, setCreatingFolderPath] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ node: FileTreeNode; x: number; y: number } | null>(null)

  const toggle = (path: string) => {
    setCollapsedPaths((previous) => {
      const next = new Set(previous)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const openMenu = (node: FileTreeNode, position: { x: number; y: number }) => {
    setMenu({ node, ...position })
  }

  return (
    <>
      <ul className='flex w-full min-w-0 flex-col gap-0.5'>
        {nodes.map((node) => (
          <NotesTreeNode
            key={node.id}
            activeDocumentId={activeDocumentId}
            collapsedPaths={collapsedPaths}
            creatingFolderPath={creatingFolderPath}
            depth={0}
            forceExpandedPaths={forceExpandedPaths}
            node={node}
            onContextMenu={openMenu}
            onCreateFolder={onCreateFolder}
            onFinishCreateFolder={() => {
              setCreatingFolderPath(null)
            }}
            onFinishRename={() => {
              setRenamingPath(null)
            }}
            onRename={onRename}
            onSelectFolder={onSelectFolder}
            onToggle={toggle}
            renamingPath={renamingPath}
            selectedFolderPath={selectedFolderPath}
          />
        ))}
      </ul>

      {menu !== null && (
        <NodeContextMenu
          node={menu.node}
          onClose={() => {
            setMenu(null)
          }}
          onCreateFolder={() => {
            const node = menu.node
            setMenu(null)
            setCreatingFolderPath(node.type === 'folder' ? node.path : parentPath(node.path))
          }}
          onCreateNote={() => {
            const node = menu.node
            setMenu(null)
            void onCreateNote(node)
          }}
          onDelete={() => {
            const node = menu.node
            setMenu(null)
            void onDelete(node)
          }}
          onRename={() => {
            const node = menu.node
            setMenu(null)
            setRenamingPath(node.path)
          }}
          x={menu.x}
          y={menu.y}
        />
      )}
    </>
  )
}

function NotesTreeNode({
  node,
  depth,
  collapsedPaths,
  activeDocumentId,
  selectedFolderPath,
  forceExpandedPaths,
  renamingPath,
  creatingFolderPath,
  onToggle,
  onContextMenu,
  onFinishRename,
  onFinishCreateFolder,
  onRename,
  onCreateFolder,
  onSelectFolder,
}: NotesTreeNodeProps) {
  const indent = depth * 12
  const isRenaming = renamingPath === node.path

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onContextMenu(node, { x: event.clientX, y: event.clientY })
  }

  const renameForm = isRenaming ? (
    <InlineRename
      initialName={node.name}
      nameLabel={
        node.type === 'document' ? 'Note name' : isVaultRoot(node) ? 'Vault name' : 'Folder name'
      }
      onCancel={onFinishRename}
      onSubmit={async (name) => {
        await onRename(node, name)
        onFinishRename()
      }}
      paddingLeft={indent + 8}
    />
  ) : null

  if (node.type === 'document') {
    return (
      <li onContextMenu={handleContextMenu}>
        {renameForm ?? (
          <SidebarMenuButton
            isActive={node.id === activeDocumentId}
            render={<Link to={`/notes/${node.id}`} />}
            style={{ paddingLeft: indent + 8 }}
          >
            <FileText aria-hidden='true' />
            <span>{node.name}</span>
          </SidebarMenuButton>
        )}
      </li>
    )
  }

  const isCreatingFolder = creatingFolderPath === node.path
  const isExpanded =
    isCreatingFolder || forceExpandedPaths.has(node.path) || !collapsedPaths.has(node.path)

  return (
    <li onContextMenu={handleContextMenu}>
      {renameForm ?? (
        <SidebarMenuButton
          isActive={node.path === selectedFolderPath}
          onClick={() => {
            onToggle(node.path)
            onSelectFolder(node.path)
          }}
          style={{ paddingLeft: indent + 8 }}
        >
          <ChevronRight
            aria-hidden='true'
            className={cn('transition-transform', isExpanded && 'rotate-90')}
          />
          {isVaultRoot(node) ? (
            <Database aria-hidden='true' />
          ) : isExpanded ? (
            <FolderOpen aria-hidden='true' />
          ) : (
            <Folder aria-hidden='true' />
          )}
          <span>{node.name}</span>
        </SidebarMenuButton>
      )}
      {isExpanded && (node.children.length > 0 || isCreatingFolder) && (
        <ul className='flex flex-col gap-0.5'>
          {isCreatingFolder && (
            <li>
              <InlineCreateFolder
                onCancel={onFinishCreateFolder}
                onSubmit={async (name) => {
                  await onCreateFolder(node, name)
                  onFinishCreateFolder()
                }}
                paddingLeft={indent + 20}
              />
            </li>
          )}
          {node.children.map((child) => (
            <NotesTreeNode
              key={child.id}
              activeDocumentId={activeDocumentId}
              collapsedPaths={collapsedPaths}
              creatingFolderPath={creatingFolderPath}
              depth={depth + 1}
              forceExpandedPaths={forceExpandedPaths}
              node={child}
              onContextMenu={onContextMenu}
              onCreateFolder={onCreateFolder}
              onFinishCreateFolder={onFinishCreateFolder}
              onFinishRename={onFinishRename}
              onRename={onRename}
              onSelectFolder={onSelectFolder}
              onToggle={onToggle}
              renamingPath={renamingPath}
              selectedFolderPath={selectedFolderPath}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

type NodeContextMenuProps = {
  node: FileTreeNode
  x: number
  y: number
  onRename: () => void
  onDelete: () => void
  onCreateNote: () => void
  onCreateFolder: () => void
  onClose: () => void
}

function NodeContextMenu({
  node,
  x,
  y,
  onRename,
  onDelete,
  onCreateNote,
  onCreateFolder,
  onClose,
}: NodeContextMenuProps) {
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const left = Math.min(x, window.innerWidth - 176)
  const top = Math.min(y, window.innerHeight - 192)

  return createPortal(
    <div
      className='fixed inset-0 z-[60]'
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div
        className='absolute min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md'
        onClick={(event) => {
          event.stopPropagation()
        }}
        role='menu'
        style={{ top, left }}
      >
        <p className='truncate px-2 py-1 text-xs text-muted-foreground'>{node.name}</p>
        <button
          className={MENU_ITEM_CLASS}
          onClick={onCreateNote}
          type='button'
        >
          New note
        </button>
        <button
          className={MENU_ITEM_CLASS}
          onClick={onCreateFolder}
          type='button'
        >
          New folder
        </button>
        <div className='my-1 h-px bg-border' />
        <button
          className={MENU_ITEM_CLASS}
          onClick={onRename}
          type='button'
        >
          Rename
        </button>
        <button
          className={cn(MENU_ITEM_CLASS, 'text-destructive')}
          onClick={onDelete}
          type='button'
        >
          Delete
        </button>
      </div>
    </div>,
    document.body,
  )
}

type InlineRenameProps = {
  initialName: string
  nameLabel: string
  paddingLeft: number
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

function InlineRename({
  initialName,
  nameLabel,
  paddingLeft,
  onSubmit,
  onCancel,
}: InlineRenameProps) {
  const [value, setValue] = useState(initialName)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = value.trim()

  const submit = async () => {
    if (trimmed === '' || isBusy || trimmed === initialName) {
      onCancel()
      return
    }
    setIsBusy(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong')
      setIsBusy(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <form
      className='flex flex-col gap-1'
      onSubmit={handleSubmit}
    >
      <Input
        autoFocus
        aria-label={nameLabel}
        className='h-7 text-sm'
        disabled={isBusy}
        onBlur={onCancel}
        onChange={(event) => {
          setValue(event.target.value)
        }}
        onKeyDown={handleKeyDown}
        style={{ marginLeft: paddingLeft }}
        value={value}
      />
      {error !== null && <p className='px-2 text-xs text-destructive'>{error}</p>}
    </form>
  )
}

type InlineCreateFolderProps = {
  paddingLeft: number
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

/** Inline field shown below a folder to name a folder being created there. */
function InlineCreateFolder({ paddingLeft, onSubmit, onCancel }: InlineCreateFolderProps) {
  const [value, setValue] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = value.trim()

  const submit = async () => {
    if (trimmed === '' || isBusy) {
      return
    }
    setIsBusy(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong')
      setIsBusy(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <form
      className='flex flex-col gap-1'
      onSubmit={handleSubmit}
    >
      <Input
        autoFocus
        aria-label='New folder name'
        className='h-7 text-sm'
        disabled={isBusy}
        onBlur={onCancel}
        onChange={(event) => {
          setValue(event.target.value)
        }}
        onKeyDown={handleKeyDown}
        placeholder='Folder name'
        style={{ marginLeft: paddingLeft }}
        value={value}
      />
      {error !== null && <p className='px-2 text-xs text-destructive'>{error}</p>}
    </form>
  )
}
