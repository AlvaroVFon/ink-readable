import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Document, Vault } from '@/lib/types'

import {
  createDocument,
  createVault as createVaultRequest,
  listDocuments,
  listVaults,
} from '@/lib/api'

import type { FileTreeNode } from '../types'

import {
  buildFileTree,
  buildFolderPath,
  buildNotePath,
  collectDocumentPaths,
  sanitizeSegment,
} from '../lib/file-tree'

type LoadedWorkspace = {
  vaults: Vault[]
  documentsByVault: Record<string, Document[]>
}

export type CreateNoteInput = {
  vaultId: string
  basePath: string
}

export type CreateFolderInput = {
  vaultId: string
  basePath: string
  name: string
}

export type UseNotesWorkspaceResult = {
  tree: FileTreeNode[]
  vaults: Vault[]
  documentsById: Map<string, Document>
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  createNote: (input: CreateNoteInput) => Promise<Document>
  createFolder: (input: CreateFolderInput) => Promise<Document>
  createVault: (name: string) => Promise<Document>
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Unable to load the workspace')
}

async function loadWorkspace(): Promise<LoadedWorkspace> {
  const vaults = await listVaults()
  const entries = await Promise.all(
    vaults.map(async (vault) => [vault.id, await listDocuments(vault.id)] as const),
  )
  return { vaults, documentsByVault: Object.fromEntries(entries) }
}

/**
 * Loads vaults and their documents and exposes the derived notes tree.
 *
 * Folders are not a backend entity, so every mutation is expressed as a
 * document creation (a "new folder" is a folder path plus an Untitled note
 * inside it, and a "new vault" also seeds an empty note).
 */
export function useNotesWorkspace(): UseNotesWorkspaceResult {
  const [vaults, setVaults] = useState<Vault[]>([])
  const [documentsByVault, setDocumentsByVault] = useState<Record<string, Document[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const applyWorkspace = useCallback((workspace: LoadedWorkspace) => {
    setVaults(workspace.vaults)
    setDocumentsByVault(workspace.documentsByVault)
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    try {
      applyWorkspace(await loadWorkspace())
    } catch (cause) {
      setError(toError(cause))
    } finally {
      setIsLoading(false)
    }
  }, [applyWorkspace])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- loading the workspace on mount
    void refresh()
  }, [refresh])

  const tree = useMemo(() => buildFileTree(vaults, documentsByVault), [vaults, documentsByVault])

  const documentsById = useMemo(() => {
    const map = new Map<string, Document>()
    for (const documents of Object.values(documentsByVault)) {
      for (const document of documents) {
        map.set(document.id, document)
      }
    }
    return map
  }, [documentsByVault])

  const createNote = useCallback(
    async ({ vaultId, basePath }: CreateNoteInput) => {
      const existingPaths = collectDocumentPaths(tree)
      const document = await createDocument(vaultId, {
        name: '',
        path: buildNotePath(basePath, existingPaths),
        content: '',
      })
      await refresh()
      return document
    },
    [tree, refresh],
  )

  const createFolder = useCallback(
    async ({ vaultId, basePath, name }: CreateFolderInput) => {
      const existingPaths = collectDocumentPaths(tree)
      const document = await createDocument(vaultId, {
        name: '',
        path: buildNotePath(buildFolderPath(basePath, name), existingPaths),
        content: '',
      })
      await refresh()
      return document
    },
    [tree, refresh],
  )

  const createVault = useCallback(
    async (name: string) => {
      const vault = await createVaultRequest(name)
      const document = await createDocument(vault.id, {
        name: '',
        path: buildNotePath(`/${sanitizeSegment(name)}`, new Set()),
        content: '',
      })
      await refresh()
      return document
    },
    [refresh],
  )

  return {
    tree,
    vaults,
    documentsById,
    isLoading,
    error,
    refresh,
    createNote,
    createFolder,
    createVault,
  }
}
