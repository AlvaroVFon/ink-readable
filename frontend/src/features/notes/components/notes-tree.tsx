import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

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
}

type NotesTreeNodeProps = Omit<NotesTreeProps, 'nodes'> & {
  node: FileTreeNode
  depth: number
  collapsedPaths: ReadonlySet<string>
  onToggle: (path: string) => void
}

/**
 * Recursive vault → folder → document tree.
 *
 * Folders keep their own collapse state; while a search is active, their
 * ancestors are force-expanded through `forceExpandedPaths`.
 */
export function NotesTree({
  nodes,
  activeDocumentId,
  selectedFolderPath,
  forceExpandedPaths,
  onSelectFolder,
}: NotesTreeProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(new Set())

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

  return (
    <ul className='flex w-full min-w-0 flex-col gap-0.5'>
      {nodes.map((node) => (
        <NotesTreeNode
          key={node.id}
          activeDocumentId={activeDocumentId}
          collapsedPaths={collapsedPaths}
          depth={0}
          forceExpandedPaths={forceExpandedPaths}
          node={node}
          onSelectFolder={onSelectFolder}
          onToggle={toggle}
          selectedFolderPath={selectedFolderPath}
        />
      ))}
    </ul>
  )
}

function NotesTreeNode({
  node,
  depth,
  collapsedPaths,
  activeDocumentId,
  selectedFolderPath,
  forceExpandedPaths,
  onToggle,
  onSelectFolder,
}: NotesTreeNodeProps) {
  const indent = depth * 12

  if (node.type === 'document') {
    return (
      <li>
        <SidebarMenuButton
          isActive={node.id === activeDocumentId}
          render={<Link to={`/notes/${node.id}`} />}
          style={{ paddingLeft: indent + 8 }}
        >
          <FileText aria-hidden='true' />
          <span>{node.name}</span>
        </SidebarMenuButton>
      </li>
    )
  }

  const isExpanded = forceExpandedPaths.has(node.path) || !collapsedPaths.has(node.path)

  return (
    <li>
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
              onSelectFolder={onSelectFolder}
              onToggle={onToggle}
              selectedFolderPath={selectedFolderPath}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
