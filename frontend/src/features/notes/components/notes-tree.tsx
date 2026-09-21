import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react'
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

type NotesTreeProps = {
  nodes: FileTreeNode[]
  activeDocumentId: string | undefined
  selectedFolderPath: string | null
  /** Folders to keep open regardless of local collapse (used while searching). */
  forceExpandedPaths: ReadonlySet<string>
  onSelectFolder: (path: string) => void
  onRename: (node: FileTreeNode, name: string) => Promise<void>
  onDelete: (node: FileTreeNode) => Promise<void>
}

type NotesTreeNodeProps = {
  node: FileTreeNode
  depth: number
  activeDocumentId: string | undefined
  selectedFolderPath: string | null
  forceExpandedPaths: ReadonlySet<string>
  collapsedPaths: ReadonlySet<string>
  renamingPath: string | null
  onSelectFolder: (path: string) => void
  onRename: (node: FileTreeNode, name: string) => Promise<void>
  onToggle: (path: string) => void
  onContextMenu: (node: FileTreeNode, position: { x: number; y: number }) => void
  onFinishRename: () => void
}

const MENU_ITEM_CLASS =
  'flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'

/** Vault roots are backend entities, not virtual folders, so they are immutable here. */
function isVaultRoot(node: FileTreeNode): boolean {
  return node.type === 'folder' && node.id === node.vaultId
}

/**
 * Recursive vault → folder → document tree.
 *
 * Folders keep their own collapse state; while a search is active, their
 * ancestors are force-expanded through `forceExpandedPaths`. Right-clicking a
 * node opens a context menu with rename and delete, and rename happens inline.
 */
export function NotesTree({
  nodes,
  activeDocumentId,
  selectedFolderPath,
  forceExpandedPaths,
  onSelectFolder,
  onRename,
  onDelete,
}: NotesTreeProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(new Set())
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
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
    if (isVaultRoot(node)) {
      return
    }
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
            depth={0}
            forceExpandedPaths={forceExpandedPaths}
            node={node}
            onContextMenu={openMenu}
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
          canModify={!isVaultRoot(menu.node)}
          node={menu.node}
          onClose={() => {
            setMenu(null)
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
  onToggle,
  onContextMenu,
  onFinishRename,
  onRename,
  onSelectFolder,
}: NotesTreeNodeProps) {
  const indent = depth * 12
  const isRenaming = renamingPath === node.path

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onContextMenu(node, { x: event.clientX, y: event.clientY })
  }

  const renameForm =
    isRenaming && !isVaultRoot(node) ? (
      <InlineRename
        initialName={node.name}
        isFolder={node.type === 'folder'}
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

  const isExpanded = forceExpandedPaths.has(node.path) || !collapsedPaths.has(node.path)

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
          {isExpanded ? <FolderOpen aria-hidden='true' /> : <Folder aria-hidden='true' />}
          <span>{node.name}</span>
        </SidebarMenuButton>
      )}
      {isExpanded && node.children.length > 0 && (
        <ul className='flex flex-col gap-0.5'>
          {node.children.map((child) => (
            <NotesTreeNode
              key={child.id}
              activeDocumentId={activeDocumentId}
              collapsedPaths={collapsedPaths}
              depth={depth + 1}
              forceExpandedPaths={forceExpandedPaths}
              node={child}
              onContextMenu={onContextMenu}
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
  canModify: boolean
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

function NodeContextMenu({
  node,
  x,
  y,
  canModify,
  onRename,
  onDelete,
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
  const top = Math.min(y, window.innerHeight - 96)

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
          disabled={!canModify}
          onClick={onRename}
          type='button'
        >
          Rename
        </button>
        <button
          className={cn(MENU_ITEM_CLASS, 'text-destructive')}
          disabled={!canModify}
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
  isFolder: boolean
  paddingLeft: number
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

function InlineRename({
  initialName,
  isFolder,
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
        aria-label={isFolder ? 'Folder name' : 'Note name'}
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
