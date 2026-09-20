import { FilePlus } from 'lucide-react'
import { useState } from 'react'

import { FileTree } from '@/components/sidebar/file-tree'
import { NewDocumentForm } from '@/components/sidebar/new-document-form'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInput,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useWorkspace } from '@/hooks/use-workspace'
import {
  buildDocumentPath,
  deriveDocumentName,
  filterTree,
  findNode,
} from '@/lib/file-tree'

export function AppSidebar() {
  const { tree, isLoading, error, createDocument } = useWorkspace()
  const [query, setQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const activeNode =
    (selectedPath ? findNode(tree, selectedPath) : null) ?? tree[0] ?? null
  const visibleTree = filterTree(tree, query)

  const handleCreate = async (input: string) => {
    if (!activeNode) {
      return
    }

    try {
      await createDocument({
        vaultId: activeNode.vaultId,
        name: deriveDocumentName(input),
        path: buildDocumentPath(activeNode.path, input),
      })
      setIsCreating(false)
      setCreateError(null)
    } catch (cause) {
      setCreateError(
        cause instanceof Error ? cause.message : 'Unable to create the document',
      )
    }
  }

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='gap-2'>
        <div className='flex items-center gap-1'>
          <SidebarInput
            aria-label='Search documents'
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search documents'
            value={query}
          />
          <Button
            aria-label='New document'
            disabled={!activeNode}
            onClick={() => {
              setCreateError(null)
              setIsCreating(true)
            }}
            size='icon-sm'
            variant='ghost'
          >
            <FilePlus aria-hidden='true' />
          </Button>
        </div>
        {isCreating && activeNode && (
          <NewDocumentForm
            basePath={activeNode.path}
            error={createError}
            onCancel={() => setIsCreating(false)}
            onSubmit={handleCreate}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        {isLoading && (
          <p className='px-3 py-2 text-sm text-muted-foreground'>Loading…</p>
        )}
        {error && <p className='px-3 py-2 text-sm text-destructive'>{error}</p>}
        {!isLoading && !error && visibleTree.length === 0 && (
          <p className='px-3 py-2 text-sm text-muted-foreground'>No documents found.</p>
        )}
        <FileTree
          nodes={visibleTree}
          selectedPath={activeNode?.path ?? null}
          onSelectFolder={setSelectedPath}
        />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
