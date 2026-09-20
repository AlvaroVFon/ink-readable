export type Vault = {
  id: string
  name: string
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export type Document = {
  id: string
  name: string
  vaultId: string
  path: string
  content: string
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export type FileTreeNode = {
  id: string
  name: string
  path: string
  vaultId: string
  type: 'folder' | 'document'
  children: FileTreeNode[]
}
