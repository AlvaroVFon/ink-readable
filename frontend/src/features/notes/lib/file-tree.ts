import type { Document, Vault } from '@/lib/types'

import type { FileTreeNode } from '../types'

const PATH_SEPARATOR = '/'
const MARKDOWN_EXTENSION = '.md'
const UNTITLED_NAME = 'Untitled'

/**
 * Builds the vault → folder → document tree.
 *
 * Folders are derived from document paths: a document at
 * `/<vault>/notes/todo.md` materializes the `notes` folder. The vault name
 * prefix is stripped when walking paths so the vault itself is the root.
 */
export function buildFileTree(
  vaults: Vault[],
  documentsByVault: Record<string, Document[]>,
): FileTreeNode[] {
  return vaults.map((vault) => buildVaultNode(vault, documentsByVault[vault.id] ?? []))
}

/**
 * Vault roots are backend entities (the vault itself), not virtual folders
 * derived from document paths, so mutations must target the vault API.
 */
export function isVaultRoot(node: FileTreeNode): boolean {
  return node.type === 'folder' && node.id === node.vaultId
}

/**
 * Filters the tree by document name or path, keeping the ancestors of every
 * match. An empty query returns the original tree unchanged.
 */
export function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') {
    return nodes
  }

  return nodes.reduce<FileTreeNode[]>((result, node) => {
    const filtered = filterNode(node, normalized)
    if (filtered !== null) {
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
    if (found !== null) {
      return found
    }
  }
  return null
}

/**
 * Builds the path for a new "Untitled" note under `basePath`, disambiguating
 * against the paths that already exist (`Untitled`, `Untitled 2`, ...).
 */
export function buildNotePath(basePath: string, existingPaths: ReadonlySet<string>): string {
  const base = normalizeBasePath(basePath)
  let index = 1
  let candidate = UNTITLED_NAME

  while (existingPaths.has(`${base}/${candidate}${MARKDOWN_EXTENSION}`)) {
    index += 1
    candidate = `${UNTITLED_NAME} ${index}`
  }

  return `${base}/${candidate}${MARKDOWN_EXTENSION}`
}

export function buildFolderPath(basePath: string, name: string): string {
  return `${normalizeBasePath(basePath)}/${sanitizeSegment(name)}`
}

/**
 * Builds a document path for an explicit (user-provided) name. A trailing
 * `.md` is stripped so renaming to "todo.md" does not produce "todo.md.md".
 */
export function buildNamedDocumentPath(basePath: string, name: string): string {
  const segment = sanitizeSegment(name).replace(/\.md$/i, '')
  return `${normalizeBasePath(basePath)}/${segment}${MARKDOWN_EXTENSION}`
}

/**
 * Builds a document path under `basePath` keeping the given name, but appends
 * a counter when that path already exists (`note.md`, `note 2.md`, ...). Used
 * when moving a document into a folder that already has a file with that name.
 */
export function buildUniqueDocumentPath(
  basePath: string,
  name: string,
  existingPaths: ReadonlySet<string>,
): string {
  const base = normalizeBasePath(basePath)
  const segment = sanitizeSegment(name).replace(/\.md$/i, '')
  let index = 1
  let candidate = segment

  while (existingPaths.has(`${base}/${candidate}${MARKDOWN_EXTENSION}`)) {
    index += 1
    candidate = `${segment} ${index}`
  }

  return `${base}/${candidate}${MARKDOWN_EXTENSION}`
}

/**
 * Returns the display name of a document path: its last segment without the
 * markdown extension.
 */
export function nameFromPath(path: string): string {
  const segments = path.split(PATH_SEPARATOR).filter(Boolean)
  const last = segments.at(-1) ?? ''
  return last.replace(/\.md$/i, '')
}

/**
 * Returns every document in the subtree rooted at `node`, so a folder can be
 * deleted or inspected through its descendant documents.
 */
export function collectDocuments(node: FileTreeNode): FileTreeNode[] {
  if (node.type === 'document') {
    return [node]
  }
  return node.children.flatMap((child) => collectDocuments(child))
}

/**
 * Returns the folder that contains `path`, or the normalized base when the path
 * has a single segment.
 */
export function parentPath(path: string): string {
  const segments = path.split(PATH_SEPARATOR).filter(Boolean)
  return normalizeBasePath(segments.slice(0, -1).join(PATH_SEPARATOR))
}

/**
 * Removes path separators so a name can be used as a single path segment.
 */
export function sanitizeSegment(name: string): string {
  return name.trim().replaceAll(PATH_SEPARATOR, '-')
}

/**
 * Collects every folder path in a tree, used to force-expand ancestors while a
 * search query is active.
 */
export function collectFolderPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.type === 'folder') {
      paths.push(node.path)
      paths.push(...collectFolderPaths(node.children))
    }
  }
  return paths
}

export function collectDocumentPaths(nodes: FileTreeNode[]): Set<string> {
  const paths = new Set<string>()
  for (const node of nodes) {
    if (node.type === 'document') {
      paths.add(node.path)
    } else {
      for (const path of collectDocumentPaths(node.children)) {
        paths.add(path)
      }
    }
  }
  return paths
}

export type CreateScope = {
  vaultId: string
  basePath: string
}

/**
 * Resolves where a new note should go: the selected folder, otherwise the
 * folder of the active document, otherwise the first vault root.
 */
export function resolveCreateScope(
  nodes: FileTreeNode[],
  vaults: Vault[],
  selectedFolderPath: string | null,
  activeDocument: Document | undefined,
): CreateScope | null {
  if (selectedFolderPath !== null) {
    const folder = findNode(nodes, selectedFolderPath)
    if (folder !== null && folder.type === 'folder') {
      return { vaultId: folder.vaultId, basePath: folder.path }
    }
  }

  if (activeDocument !== undefined) {
    return { vaultId: activeDocument.vaultId, basePath: parentPath(activeDocument.path) }
  }

  const first = vaults[0]
  if (first !== undefined) {
    return { vaultId: first.id, basePath: `/${sanitizeSegment(first.name)}` }
  }

  return null
}

function normalizeBasePath(basePath: string): string {
  const segments = basePath.split(PATH_SEPARATOR).filter(Boolean)
  return segments.length === 0 ? '' : `${PATH_SEPARATOR}${segments.join(PATH_SEPARATOR)}`
}

function buildVaultNode(vault: Vault, documents: Document[]): FileTreeNode {
  const segment = sanitizeSegment(vault.name)
  const root: FileTreeNode = {
    id: vault.id,
    name: vault.name,
    path: `${PATH_SEPARATOR}${segment}`,
    vaultId: vault.id,
    type: 'folder',
    children: [],
  }

  for (const document of documents) {
    insertDocument(root, segment, document)
  }

  sortNodes(root.children)
  return root
}

function insertDocument(root: FileTreeNode, vaultSegment: string, document: Document): void {
  const segments = document.path.split(PATH_SEPARATOR).filter(Boolean)
  const relative = segments[0] === vaultSegment ? segments.slice(1) : segments

  let parent = root
  for (let index = 0; index < relative.length - 1; index += 1) {
    parent = ensureFolder(parent, relative[index], root.vaultId)
  }

  parent.children.push({
    id: document.id,
    name: document.name,
    path: document.path,
    vaultId: root.vaultId,
    type: 'document',
    children: [],
  })
}

function ensureFolder(parent: FileTreeNode, name: string, vaultId: string): FileTreeNode {
  const existing = parent.children.find((child) => child.type === 'folder' && child.name === name)
  if (existing !== undefined) {
    return existing
  }

  const path = `${parent.path}${PATH_SEPARATOR}${name}`
  const folder: FileTreeNode = {
    id: path,
    name,
    path,
    vaultId,
    type: 'folder',
    children: [],
  }
  parent.children.push(folder)
  return folder
}

function filterNode(node: FileTreeNode, query: string): FileTreeNode | null {
  if (node.type === 'document') {
    return node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query)
      ? node
      : null
  }

  const children = node.children.reduce<FileTreeNode[]>((result, child) => {
    const filtered = filterNode(child, query)
    if (filtered !== null) {
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
