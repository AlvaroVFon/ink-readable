import { describe, expect, it } from 'vitest'

import type { Document, Vault } from './types'

import {
  buildDocumentPath,
  buildFileTree,
  deriveDocumentName,
  filterTree,
  findNode,
} from './file-tree'

function vault(id: string, name: string): Vault {
  return { id, name, deleted: false, createdAt: '', updatedAt: '' }
}

function document(id: string, name: string, vaultId: string, path: string): Document {
  return {
    id,
    name,
    vaultId,
    path,
    content: '',
    deleted: false,
    createdAt: '',
    updatedAt: '',
  }
}

describe('buildFileTree', () => {
  it('nests documents under folders derived from their path', () => {
    const tree = buildFileTree([vault('v1', 'Reading')], {
      v1: [
        document('d1', 'a', 'v1', '/Reading/a.md'),
        document('d2', 'b', 'v1', '/Reading/notes/b.md'),
      ],
    })

    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('Reading')
    expect(tree[0].children.map((node) => node.name)).toEqual(['notes', 'a'])
    expect(findNode(tree, '/Reading/notes')?.children[0].name).toBe('b')
  })

  it('keeps paths that do not start with the vault name', () => {
    const tree = buildFileTree([vault('v1', 'Reading')], {
      v1: [document('d1', 'c', 'v1', '/loose/c.md')],
    })

    expect(tree[0].children.map((node) => node.name)).toEqual(['loose'])
    expect(findNode(tree, '/Reading/loose')?.children[0].name).toBe('c')
  })
})

describe('filterTree', () => {
  const tree = buildFileTree([vault('v1', 'Reading')], {
    v1: [
      document('d1', 'alpha', 'v1', '/Reading/alpha.md'),
      document('d2', 'beta', 'v1', '/Reading/notes/beta.md'),
    ],
  })

  it('returns the tree unchanged for an empty query', () => {
    expect(filterTree(tree, '   ')).toBe(tree)
  })

  it('keeps the ancestors of matching documents', () => {
    const filtered = filterTree(tree, 'beta')

    expect(filtered).toHaveLength(1)
    expect(filtered[0].children.map((node) => node.name)).toEqual(['notes'])
    expect(filtered[0].children[0].children[0].name).toBe('beta')
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterTree(tree, 'zzz')).toEqual([])
  })
})

describe('buildDocumentPath', () => {
  it('falls back to an untitled segment for empty input', () => {
    expect(buildDocumentPath('/Reading', '   ')).toBe('/Reading/untitled.md')
  })

  it('appends the markdown extension when missing', () => {
    expect(buildDocumentPath('/Reading', 'ideas')).toBe('/Reading/ideas.md')
  })

  it('creates nested folders from the input', () => {
    expect(buildDocumentPath('/Reading', 'notes/todo')).toBe('/Reading/notes/todo.md')
  })

  it('keeps an existing extension and base path', () => {
    expect(buildDocumentPath('/Reading/notes/', 'todo.md')).toBe(
      '/Reading/notes/todo.md',
    )
  })
})

describe('deriveDocumentName', () => {
  it('returns an empty name for empty input', () => {
    expect(deriveDocumentName('  ')).toBe('')
  })

  it('uses the last segment without the extension', () => {
    expect(deriveDocumentName('notes/todo.md')).toBe('todo')
    expect(deriveDocumentName('ideas')).toBe('ideas')
  })
})
