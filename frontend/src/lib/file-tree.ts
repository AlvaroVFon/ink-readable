import type { Document, FileTreeNode, Vault } from './types'

const PATH_SEPARATOR = '/'
const MARKDOWN_EXTENSION = '.md'
const UNTITLED_SEGMENT = 'untitled'

export function buildFileTree(
  vaults: Vault[],
  documentsByVault: Record<string, Document[]>,
): FileTreeNode[] {
  return vaults.map((vault) => buildVaultNode(vault, documentsByVault[vault.id] ?? []))
}

export function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') {
    return nodes
  }

  return nodes.reduce<FileTreeNode[]>((result, node) => {
    const filtered = filterNode(node, normalized)
    if (filtered) {
      result.push(filtered)
    }
    return result
  }, [])
}

export function findNode(nodes: FileTreeNode[], path: string): FileTreeNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node
    }
    const found = findNode(node.children, path)
    if (found) {
      return found
    }
  }
  return null
}

export function buildDocumentPath(basePath: string, input: string): string {
  const base = basePath.replace(/\/+$/, '')
  const trimmed = input.trim()
  if (trimmed === '') {
    return `${base}/${UNTITLED_SEGMENT}${MARKDOWN_EXTENSION}`
  }

  const segments = trimmed.split(PATH_SEPARATOR).filter(Boolean)
  const last = segments[segments.length - 1] ?? ''
  if (!last.includes('.')) {
    segments[segments.length - 1] = `${last}${MARKDOWN_EXTENSION}`
  }
  return `${base}/${segments.join(PATH_SEPARATOR)}`
}

export function deriveDocumentName(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') {
    return ''
  }

  const segments = trimmed.split(PATH_SEPARATOR).filter(Boolean)
  const last = segments[segments.length - 1] ?? ''
  return last.replace(new RegExp(`${MARKDOWN_EXTENSION}$`, 'i'), '')
}

function buildVaultNode(vault: Vault, documents: Document[]): FileTreeNode {
  const root: FileTreeNode = {
    id: vault.id,
    name: vault.name,
    path: `${PATH_SEPARATOR}${vault.name}`,
    vaultId: vault.id,
    type: 'folder',
    children: [],
  }

  for (const document of documents) {
    insertDocument(root, vault, document)
  }

  sortNodes(root.children)
  return root
}

function insertDocument(root: FileTreeNode, vault: Vault, document: Document): void {
  const segments = document.path.split(PATH_SEPARATOR).filter(Boolean)
  const relative = segments[0] === vault.name ? segments.slice(1) : segments

  let parent = root
  for (let index = 0; index < relative.length - 1; index += 1) {
    parent = ensureFolder(parent, relative[index], vault.id)
  }

  parent.children.push({
    id: document.id,
    name: document.name,
    path: document.path,
    vaultId: vault.id,
    type: 'document',
    children: [],
  })
}

function ensureFolder(
  parent: FileTreeNode,
  name: string,
  vaultId: string,
): FileTreeNode {
  const existing = parent.children.find(
    (child) => child.type === 'folder' && child.name === name,
  )
  if (existing) {
    return existing
  }

  const folder: FileTreeNode = {
    id: `${parent.path}${PATH_SEPARATOR}${name}`,
    name,
    path: `${parent.path}${PATH_SEPARATOR}${name}`,
    vaultId,
    type: 'folder',
    children: [],
  }
  parent.children.push(folder)
  return folder
}

function filterNode(node: FileTreeNode, query: string): FileTreeNode | null {
  if (node.type === 'document') {
    return node.name.toLowerCase().includes(query) ? node : null
  }

  const children = node.children.reduce<FileTreeNode[]>((result, child) => {
    const filtered = filterNode(child, query)
    if (filtered) {
      result.push(filtered)
    }
    return result
  }, [])

  if (children.length > 0 || node.name.toLowerCase().includes(query)) {
    return { ...node, children }
  }
  return null
}

function sortNodes(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

  for (const node of nodes) {
    sortNodes(node.children)
  }
}
