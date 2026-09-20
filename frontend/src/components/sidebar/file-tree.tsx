import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react'
import { useState } from 'react'

import type { FileTreeNode } from '@/lib/types'

import { cn } from '@/lib/utils'

type FileTreeProps = {
  nodes: FileTreeNode[]
  selectedPath: string | null
  onSelectFolder: (path: string) => void
}

type FileTreeItemProps = {
  node: FileTreeNode
  depth: number
  selectedPath: string | null
  onSelectFolder: (path: string) => void
}

export function FileTree({ nodes, selectedPath, onSelectFolder }: FileTreeProps) {
  if (nodes.length === 0) {
    return null
  }

  return (
    <ul className='flex flex-col gap-0.5 px-1 py-1'>
      {nodes.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </ul>
  )
}

function FileTreeItem({
  node,
  depth,
  selectedPath,
  onSelectFolder,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isSelected = node.type === 'folder' && node.path === selectedPath
  const indent = depth * 12 + 8

  if (node.type === 'document') {
    return (
      <li>
        <div
          className='flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-sidebar-foreground/80'
          style={{ paddingLeft: indent }}
        >
          <FileText aria-hidden='true' className='size-4 shrink-0' />
          <span className='truncate'>{node.name}</span>
        </div>
      </li>
    )
  }

  return (
    <li>
      <button
        type='button'
        aria-expanded={isExpanded}
        onClick={() => {
          setIsExpanded((value) => !value)
          onSelectFolder(node.path)
        }}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isSelected && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
        )}
        style={{ paddingLeft: indent }}
      >
        <ChevronRight
          aria-hidden='true'
          className={cn(
            'size-3.5 shrink-0 transition-transform',
            isExpanded && 'rotate-90',
          )}
        />
        {isExpanded ? (
          <FolderOpen aria-hidden='true' className='size-4 shrink-0' />
        ) : (
          <Folder aria-hidden='true' className='size-4 shrink-0' />
        )}
        <span className='truncate'>{node.name}</span>
      </button>
      {isExpanded && node.children.length > 0 && (
        <ul className='flex flex-col gap-0.5'>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
