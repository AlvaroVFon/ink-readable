export type ViewMode = 'edit' | 'split' | 'preview'

/**
 * A node in the notes sidebar tree.
 *
 * Vaults are the roots; folders are derived from document paths (the backend
 * has no folder entity). `path` is the full document path, so folders and
 * documents share the same addressing scheme.
 */
export type FileTreeNode = {
  id: string
  name: string
  path: string
  vaultId: string
  type: 'folder' | 'document'
  children: FileTreeNode[]
}
