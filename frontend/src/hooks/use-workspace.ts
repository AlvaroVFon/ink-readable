import { useCallback, useEffect, useState } from 'react'

import type { Document, FileTreeNode, Vault } from '@/lib/types'

import {
  createDocument as createDocumentRequest,
  listDocuments,
  listVaults,
} from '@/lib/api'
import { buildFileTree } from '@/lib/file-tree'

type CreateDocumentArgs = {
  vaultId: string
  name: string
  path: string
  content?: string
}

export function useWorkspace() {
  const [vaults, setVaults] = useState<Vault[]>([])
  const [documentsByVault, setDocumentsByVault] = useState<Record<string, Document[]>>(
    {},
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const loadedVaults = await listVaults()
      const documents = await Promise.all(
        loadedVaults.map(async (vault) => {
          const items = await listDocuments(vault.id)
          return [vault.id, items] as const
        }),
      )

      setVaults(loadedVaults)
      setDocumentsByVault(Object.fromEntries(documents))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the workspace')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  const createDocument = useCallback(
    async ({ vaultId, name, path, content = '' }: CreateDocumentArgs) => {
      await createDocumentRequest(vaultId, { name, path, content })
      await refresh()
    },
    [refresh],
  )

  const tree: FileTreeNode[] = buildFileTree(vaults, documentsByVault)

  return { tree, isLoading, error, refresh, createDocument }
}
