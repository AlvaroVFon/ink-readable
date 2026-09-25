import { ChevronRight, Database, FileText, Folder, FolderOpen } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router'

import { Input } from '@/components/ui/input'
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

import type { FileTreeNode } from '../types'

import { findNodeById, isVaultRoot, parentPath } from '../lib/file-tree'
import { resolveLeaderKey } from '../lib/leader-keys'
import {
  findVisibleIndex,
  firstChildIndex,
  flattenVisibleNodes,
  initialCursorIndex,
  moveCursor,
  parentIndex,
} from '../lib/tree-navigation'
import { useNotesVimContext } from '../notes-vim-context'

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
  onCreateNamedNote: (node: FileTreeNode, name: string) => Promise<void>
  onCreateFolder: (node: FileTreeNode, name: string) => Promise<void>
  onMove: (node: FileTreeNode, targetFolderPath: string) => Promise<void>
}

type NotesTreeNodeProps = {
  node: FileTreeNode
  depth: number
  activeDocumentId: string | undefined
  selectedFolderPath: string | null
  forceExpandedPaths: ReadonlySet<string>
  collapsedPaths: ReadonlySet<string>
  cursorPath: string | null
  renamingPath: string | null
  creatingFolderPath: string | null
  creatingNotePath: string | null
  draggingNode: FileTreeNode | null
  dragOverPath: string | null
  onSelectFolder: (path: string) => void
  onRename: (node: FileTreeNode, name: string) => Promise<void>
  onToggle: (path: string) => void
  onContextMenu: (node: FileTreeNode, position: { x: number; y: number }) => void
  onFinishRename: () => void
  onCreateFolder: (node: FileTreeNode, name: string) => Promise<void>
  onFinishCreateFolder: () => void
  onCreateNamedNote: (node: FileTreeNode, name: string) => Promise<void>
  onFinishCreateNote: () => void
  canDropOn: (folder: FileTreeNode) => boolean
  onDragStart: (node: FileTreeNode) => void
  onDragEnd: () => void
  onDragOverFolder: (folder: FileTreeNode) => void
  onDragLeaveFolder: (path: string) => void
  onDropOnFolder: (folder: FileTreeNode) => void
}

const MENU_ITEM_CLASS =
  'flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'

// VS Code-like rows: flat, full-width, no rounding, with a left accent bar
// marking the active note/folder and a background for the keyboard cursor.
const TREE_ROW_CLASS =
  'rounded-none border-l-2 border-transparent focus-visible:ring-inset data-active:border-sidebar-primary data-cursor:bg-sidebar-accent data-cursor:text-sidebar-accent-foreground data-cursor:ring-1 data-cursor:ring-sidebar-ring/50 data-cursor:ring-inset'

const LEADER_TIMEOUT_MS = 1000

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Recursive vault → folder → document tree.
 *
 * Folders keep their own collapse state; while a search is active, their
 * ancestors are force-expanded through `forceExpandedPaths`. Right-clicking a
 * node opens a context menu with creation, rename and delete. Rename happens
 * inline, and a new folder is named through an inline field below its parent.
 *
 * Documents can be dragged onto a folder of the same vault to move them.
 *
 * The tree is also keyboard driven (vim-like): `j`/`k` move a cursor, `h`/`l`
 * collapse/expand or open, `a`/`A` create a note/folder, `r` renames and `d`
 * deletes. `space e` toggles the sidebar and `space space` opens the finder.
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
  onCreateNamedNote,
  onCreateFolder,
  onMove,
}: NotesTreeProps) {
  const navigate = useNavigate()
  const { focus: focusTarget, focusEditor, openFinder } = useNotesVimContext()
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leaderRef = useRef(false)
  const leaderTimeoutRef = useRef<number | null>(null)
  const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(new Set())
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [creatingFolderPath, setCreatingFolderPath] = useState<string | null>(null)
  const [creatingNotePath, setCreatingNotePath] = useState<string | null>(null)
  const [cursorPath, setCursorPath] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<FileTreeNode | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ node: FileTreeNode; x: number; y: number } | null>(null)

  const isFolderExpanded = useCallback(
    (node: FileTreeNode) =>
      node.type === 'folder' &&
      (forceExpandedPaths.has(node.path) || !collapsedPaths.has(node.path)),
    [collapsedPaths, forceExpandedPaths],
  )

  const visible = useMemo(
    () => flattenVisibleNodes(nodes, isFolderExpanded),
    [nodes, isFolderExpanded],
  )

  const activePath = useMemo(() => {
    if (activeDocumentId === undefined) {
      return null
    }
    return findNodeById(nodes, activeDocumentId)?.path ?? null
  }, [nodes, activeDocumentId])

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

  const setCollapsed = (path: string, collapsed: boolean) => {
    setCollapsedPaths((previous) => {
      const next = new Set(previous)
      if (collapsed) {
        next.add(path)
      } else {
        next.delete(path)
      }
      return next
    })
  }

  const clearLeaderTimeout = useCallback(() => {
    if (leaderTimeoutRef.current !== null) {
      window.clearTimeout(leaderTimeoutRef.current)
      leaderTimeoutRef.current = null
    }
  }, [])

  useEffect(() => clearLeaderTimeout, [clearLeaderTimeout])

  // Pull DOM focus into the tree when the app switches to the sidebar pane.
  useEffect(() => {
    if (focusTarget === 'sidebar') {
      containerRef.current?.focus()
    }
  }, [focusTarget])

  // Keep the cursor on a row that still exists after tree mutations.
  useEffect(() => {
    if (cursorPath === null || findVisibleIndex(visible, cursorPath) !== -1) {
      return
    }
    // oxlint-disable-next-line react/set-state-in-effect -- resync the cursor after tree mutations
    setCursorPath(visible.length > 0 ? visible[0].node.path : null)
  }, [visible, cursorPath])

  // Keep the cursor row in view while navigating.
  useEffect(() => {
    if (cursorPath === null) {
      return
    }
    const rows = containerRef.current?.querySelectorAll<HTMLElement>('[data-tree-path]')
    if (rows === undefined) {
      return
    }
    for (const row of rows) {
      if (row.dataset.treePath === cursorPath) {
        row.scrollIntoView({ block: 'nearest' })
        return
      }
    }
  }, [cursorPath])

  const handleFocus = () => {
    if (findVisibleIndex(visible, cursorPath) !== -1) {
      return
    }
    const index = initialCursorIndex(visible, activePath)
    setCursorPath(index === -1 ? null : visible[index].node.path)
  }

  const cursorIndex = (): number => {
    const found = findVisibleIndex(visible, cursorPath)
    return found === -1 ? initialCursorIndex(visible, activePath) : found
  }

  const moveCursorTo = (index: number) => {
    if (index < 0 || index >= visible.length) {
      return
    }
    setCursorPath(visible[index].node.path)
  }

  const openDocument = (node: FileTreeNode) => {
    void navigate(`/notes/${node.id}`)
    focusEditor()
  }

  const startCreateNote = (node: FileTreeNode) => {
    setCreatingNotePath(node.type === 'folder' ? node.path : parentPath(node.path))
    setCursorPath(node.path)
  }

  const startCreateFolder = (node: FileTreeNode) => {
    setCreatingFolderPath(node.type === 'folder' ? node.path : parentPath(node.path))
    setCursorPath(node.path)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isTextEntry(event.target)) {
      return
    }

    const resolution = resolveLeaderKey(leaderRef.current, event.key)
    if (resolution.leader) {
      leaderRef.current = true
      clearLeaderTimeout()
      leaderTimeoutRef.current = window.setTimeout(() => {
        leaderRef.current = false
      }, LEADER_TIMEOUT_MS)
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (resolution.action === 'toggleSidebar') {
      leaderRef.current = false
      event.preventDefault()
      event.stopPropagation()
      if (sidebarOpen) {
        setSidebarOpen(false)
        focusEditor()
      } else {
        setSidebarOpen(true)
      }
      return
    }
    if (resolution.action === 'openFinder') {
      leaderRef.current = false
      event.preventDefault()
      event.stopPropagation()
      openFinder()
      return
    }

    const index = cursorIndex()
    const node = index === -1 ? null : visible[index].node
    const expanded = (target: FileTreeNode): boolean =>
      forceExpandedPaths.has(target.path) || !collapsedPaths.has(target.path)

    switch (event.key) {
      case 'j':
        moveCursorTo(moveCursor(visible, index, 1))
        break
      case 'k':
        moveCursorTo(moveCursor(visible, index, -1))
        break
      case 'g':
        moveCursorTo(0)
        break
      case 'G':
        moveCursorTo(visible.length - 1)
        break
      case 'h':
        if (node === null) {
          break
        }
        if (node.type === 'folder' && expanded(node)) {
          setCollapsed(node.path, true)
        } else {
          moveCursorTo(parentIndex(visible, index))
        }
        break
      case 'l':
        if (node === null) {
          break
        }
        if (node.type === 'document') {
          openDocument(node)
        } else if (!expanded(node)) {
          setCollapsed(node.path, false)
        } else {
          moveCursorTo(firstChildIndex(visible, index))
        }
        break
      case 'Enter':
        if (node === null) {
          break
        }
        if (node.type === 'document') {
          openDocument(node)
        } else {
          toggle(node.path)
        }
        break
      case 'a':
        if (node !== null) {
          startCreateNote(node)
        }
        break
      case 'A':
        if (node !== null) {
          startCreateFolder(node)
        }
        break
      case 'r':
        if (node !== null) {
          setRenamingPath(node.path)
        }
        break
      case 'd':
        if (node !== null) {
          void onDelete(node)
        }
        break
      case 'Escape':
      case 'q':
        focusEditor()
        break
      default:
        return
    }

    event.preventDefault()
    event.stopPropagation()
  }

  const openMenu = (node: FileTreeNode, position: { x: number; y: number }) => {
    setMenu({ node, ...position })
  }

  // A document can only move into a folder of its own vault, and never into the
  // folder it already lives in.
  const canDropOn = (folder: FileTreeNode): boolean =>
    draggingNode !== null &&
    draggingNode.type === 'document' &&
    folder.type === 'folder' &&
    draggingNode.vaultId === folder.vaultId &&
    parentPath(draggingNode.path) !== folder.path

  const handleDragStart = (node: FileTreeNode) => {
    setDraggingNode(node)
  }

  const handleDragEnd = () => {
    setDraggingNode(null)
    setDragOverPath(null)
  }

  const handleDropOnFolder = (folder: FileTreeNode) => {
    if (draggingNode === null || !canDropOn(folder)) {
      return
    }
    const node = draggingNode
    handleDragEnd()
    void onMove(node, folder.path)
  }

  return (
    <div
      className='outline-hidden'
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      ref={containerRef}
      tabIndex={-1}
    >
      <ul className='flex w-full min-w-0 flex-col gap-0.5'>
        {nodes.map((node) => (
          <NotesTreeNode
            key={node.id}
            activeDocumentId={activeDocumentId}
            canDropOn={canDropOn}
            collapsedPaths={collapsedPaths}
            creatingFolderPath={creatingFolderPath}
            creatingNotePath={creatingNotePath}
            cursorPath={cursorPath}
            depth={0}
            draggingNode={draggingNode}
            dragOverPath={dragOverPath}
            forceExpandedPaths={forceExpandedPaths}
            node={node}
            onContextMenu={openMenu}
            onCreateFolder={onCreateFolder}
            onCreateNamedNote={onCreateNamedNote}
            onDragEnd={handleDragEnd}
            onDragLeaveFolder={(path) => {
              setDragOverPath((current) => (current === path ? null : current))
            }}
            onDragOverFolder={(folder) => {
              setDragOverPath(folder.path)
            }}
            onDragStart={handleDragStart}
            onDropOnFolder={handleDropOnFolder}
            onFinishCreateFolder={() => {
              setCreatingFolderPath(null)
            }}
            onFinishCreateNote={() => {
              setCreatingNotePath(null)
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
    </div>
  )
}

function NotesTreeNode({
  node,
  depth,
  collapsedPaths,
  activeDocumentId,
  selectedFolderPath,
  forceExpandedPaths,
  cursorPath,
  renamingPath,
  creatingFolderPath,
  creatingNotePath,
  draggingNode,
  dragOverPath,
  onToggle,
  onContextMenu,
  onFinishRename,
  onFinishCreateFolder,
  onFinishCreateNote,
  onRename,
  onCreateFolder,
  onCreateNamedNote,
  onSelectFolder,
  canDropOn,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDragLeaveFolder,
  onDropOnFolder,
}: NotesTreeNodeProps) {
  const indent = depth * 12
  const isRenaming = renamingPath === node.path
  const isDragging = draggingNode?.id === node.id
  const isCursor = cursorPath === node.path

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onContextMenu(node, { x: event.clientX, y: event.clientY })
  }

  const handleDragStart = (event: ReactDragEvent) => {
    if (node.type !== 'document') {
      return
    }
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', node.id)
    }
    onDragStart(node)
  }

  const handleFolderDragOver = (event: ReactDragEvent) => {
    if (!canDropOn(node)) {
      return
    }
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    onDragOverFolder(node)
  }

  const handleFolderDrop = (event: ReactDragEvent) => {
    if (!canDropOn(node)) {
      return
    }
    event.preventDefault()
    onDropOnFolder(node)
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
      <li
        className={cn(isDragging && 'opacity-50')}
        data-cursor={isCursor ? '' : undefined}
        data-tree-path={node.path}
        draggable
        onContextMenu={handleContextMenu}
        onDragEnd={onDragEnd}
        onDragStart={handleDragStart}
      >
        {renameForm ?? (
          <SidebarMenuButton
            className={TREE_ROW_CLASS}
            data-cursor={isCursor ? '' : undefined}
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
  const isCreatingNote = creatingNotePath === node.path
  const isCreating = isCreatingFolder || isCreatingNote
  const isExpanded =
    isCreating || forceExpandedPaths.has(node.path) || !collapsedPaths.has(node.path)
  const isDropTarget = dragOverPath === node.path

  return (
    <li
      data-cursor={isCursor ? '' : undefined}
      data-tree-path={node.path}
      onContextMenu={handleContextMenu}
    >
      {renameForm ?? (
        <div
          className={cn('rounded-none', isDropTarget && 'bg-accent ring-1 ring-ring/50 ring-inset')}
          onDragLeave={() => {
            onDragLeaveFolder(node.path)
          }}
          onDragOver={handleFolderDragOver}
          onDrop={handleFolderDrop}
        >
          <SidebarMenuButton
            className={TREE_ROW_CLASS}
            data-cursor={isCursor ? '' : undefined}
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
        </div>
      )}
      {isExpanded && (node.children.length > 0 || isCreating) && (
        <ul className='flex flex-col gap-0.5'>
          {isCreatingNote && (
            <li data-tree-path={`${node.path}/__new_note__`}>
              <InlineCreateName
                label='New note name'
                onCancel={onFinishCreateNote}
                onSubmit={async (name) => {
                  const trimmed = name.trim()
                  if (trimmed.endsWith('/')) {
                    await onCreateFolder(node, trimmed.replace(/\/+$/, ''))
                  } else {
                    await onCreateNamedNote(node, trimmed)
                  }
                  onFinishCreateNote()
                }}
                paddingLeft={indent + 20}
                placeholder='Note name (end with / for a folder)'
              />
            </li>
          )}
          {isCreatingFolder && (
            <li data-tree-path={`${node.path}/__new_folder__`}>
              <InlineCreateName
                label='New folder name'
                onCancel={onFinishCreateFolder}
                onSubmit={async (name) => {
                  await onCreateFolder(node, name)
                  onFinishCreateFolder()
                }}
                paddingLeft={indent + 20}
                placeholder='Folder name'
              />
            </li>
          )}
          {node.children.map((child) => (
            <NotesTreeNode
              key={child.id}
              activeDocumentId={activeDocumentId}
              canDropOn={canDropOn}
              collapsedPaths={collapsedPaths}
              creatingFolderPath={creatingFolderPath}
              creatingNotePath={creatingNotePath}
              cursorPath={cursorPath}
              depth={depth + 1}
              draggingNode={draggingNode}
              dragOverPath={dragOverPath}
              forceExpandedPaths={forceExpandedPaths}
              node={child}
              onContextMenu={onContextMenu}
              onCreateFolder={onCreateFolder}
              onCreateNamedNote={onCreateNamedNote}
              onDragEnd={onDragEnd}
              onDragLeaveFolder={onDragLeaveFolder}
              onDragOverFolder={onDragOverFolder}
              onDragStart={onDragStart}
              onDropOnFolder={onDropOnFolder}
              onFinishCreateFolder={onFinishCreateFolder}
              onFinishCreateNote={onFinishCreateNote}
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
      className='flex min-w-0 flex-col gap-1'
      onSubmit={handleSubmit}
      style={{ paddingLeft }}
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
        value={value}
      />
      {error !== null && <p className='px-2 text-xs text-destructive'>{error}</p>}
    </form>
  )
}

type InlineCreateNameProps = {
  label: string
  placeholder: string
  paddingLeft: number
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

/**
 * Inline field shown below a folder to name a note or folder being created
 * there. A note name ending in `/` is treated as a folder by the caller.
 */
function InlineCreateName({
  label,
  placeholder,
  paddingLeft,
  onSubmit,
  onCancel,
}: InlineCreateNameProps) {
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
      className='flex min-w-0 flex-col gap-1'
      onSubmit={handleSubmit}
      style={{ paddingLeft }}
    >
      <Input
        autoFocus
        aria-label={label}
        className='h-7 text-sm'
        disabled={isBusy}
        onBlur={onCancel}
        onChange={(event) => {
          setValue(event.target.value)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={value}
      />
      {error !== null && <p className='px-2 text-xs text-destructive'>{error}</p>}
    </form>
  )
}
