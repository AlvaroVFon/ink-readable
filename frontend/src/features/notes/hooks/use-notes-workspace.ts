import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Document, Vault } from '@/lib/types'

import {
  createDocument,
  createVault as createVaultRequest,
  deleteDocument as deleteDocumentRequest,
  deleteVault as deleteVaultRequest,
  listDocuments,
  listVaults,
  moveDocument as moveDocumentRequest,
  renameDocument as renameDocumentRequest,
  renameDocumentPath as renameDocumentPathRequest,
  renameVault as renameVaultRequest,
} from '@/lib/api'

import type { FileTreeNode } from '../types'

import {
  buildFileTree,
  buildFolderPath,
  buildNamedDocumentPath,
  buildNotePath,
  buildUniqueDocumentPath,
  collectDocuments,
  collectDocumentPaths,
  nameFromPath,
  parentPath,
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
  /** Bumped after a metadata mutation (rename/delete) so consumers can reload. */
  revision: number
  refresh: () => Promise<void>
  createNote: (input: CreateNoteInput) => Promise<Document>
  createFolder: (input: CreateFolderInput) => Promise<Document>
  createVault: (name: string) => Promise<Document>
  renameVault: (vaultId: string, name: string) => Promise<void>
  deleteVault: (vaultId: string) => Promise<void>
  renameNode: (node: FileTreeNode, name: string) => Promise<void>
  moveNode: (node: FileTreeNode, targetFolderPath: string) => Promise<void>
  deleteNode: (node: FileTreeNode) => Promise<void>
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
  const [revision, setRevision] = useState(0)

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
      const path = buildNotePath(basePath, existingPaths)
      const document = await createDocument(vaultId, {
        name: nameFromPath(path),
        path,
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
      const path = buildNotePath(buildFolderPath(basePath, name), existingPaths)
      const document = await createDocument(vaultId, {
        name: nameFromPath(path),
        path,
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
      const path = buildNotePath(`/${sanitizeSegment(name)}`, new Set())
      const document = await createDocument(vault.id, {
        name: nameFromPath(path),
        path,
        content: '',
      })
      await refresh()
      return document
    },
    [refresh],
  )

  const renameVault = useCallback(
    async (vaultId: string, name: string) => {
      const trimmed = name.trim()
      if (trimmed === '') {
        throw new Error('Name cannot be empty')
      }
      await renameVaultRequest(vaultId, { name: trimmed })
      await refresh()
      setRevision((value) => value + 1)
    },
    [refresh],
  )

  const deleteVault = useCallback(
    async (vaultId: string) => {
      await deleteVaultRequest(vaultId)
      await refresh()
      setRevision((value) => value + 1)
    },
    [refresh],
  )

  const renameNode = useCallback(
    async (node: FileTreeNode, name: string) => {
      const trimmed = name.trim()
      if (trimmed === '') {
        throw new Error('Name cannot be empty')
      }

      if (node.type === 'document') {
        const path = buildNamedDocumentPath(parentPath(node.path), trimmed)
        if (path === node.path) {
          return
        }
        await renameDocumentRequest(node.id, { name: nameFromPath(path), path })
      } else {
        const path = buildFolderPath(parentPath(node.path), trimmed)
        if (path === node.path) {
          return
        }
        await renameDocumentPathRequest(node.vaultId, { oldPath: node.path, newPath: path })
      }

      await refresh()
      setRevision((value) => value + 1)
    },
    [refresh],
  )

  const moveNode = useCallback(
    async (node: FileTreeNode, targetFolderPath: string) => {
      if (node.type !== 'document' || parentPath(node.path) === targetFolderPath) {
        return
      }

      const existingPaths = collectDocumentPaths(tree)
      existingPaths.delete(node.path)
      const path = buildUniqueDocumentPath(targetFolderPath, node.name, existingPaths)
      await moveDocumentRequest(node.id, { path })
      await refresh()
      setRevision((value) => value + 1)
    },
    [tree, refresh],
  )

  const deleteNode = useCallback(
    async (node: FileTreeNode) => {
      const documents = collectDocuments(node)
      if (documents.length === 0) {
        return
      }
      await Promise.all(documents.map((document) => deleteDocumentRequest(document.id)))
      await refresh()
      setRevision((value) => value + 1)
    },
    [refresh],
  )

  return {
    tree,
    vaults,
    documentsById,
    isLoading,
    error,
    revision,
    refresh,
    createNote,
    createFolder,
    createVault,
    renameVault,
    deleteVault,
    renameNode,
    moveNode,
    deleteNode,
  }
}
