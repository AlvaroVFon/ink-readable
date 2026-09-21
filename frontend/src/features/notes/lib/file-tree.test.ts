import { describe, expect, it } from 'vitest'

import type { Document, Vault } from '@/lib/types'

import {
  buildFileTree,
  buildFolderPath,
  buildNotePath,
  collectDocumentPaths,
  collectFolderPaths,
  filterTree,
  findNode,
  parentPath,
  resolveCreateScope,
  sanitizeSegment,
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
    expect(tree[0]?.name).toBe('Reading')
    expect(tree[0]?.children.map((node) => node.name)).toEqual(['notes', 'a'])
    expect(findNode(tree, '/Reading/notes')?.children[0]?.name).toBe('b')
  })

  it('keeps paths that do not start with the vault name', () => {
    const tree = buildFileTree([vault('v1', 'Reading')], {
      v1: [document('d1', 'c', 'v1', '/loose/c.md')],
    })

    expect(tree[0]?.children.map((node) => node.name)).toEqual(['loose'])
    expect(findNode(tree, '/Reading/loose')?.children[0]?.name).toBe('c')
  })

  it('sorts folders before documents alphabetically', () => {
    const tree = buildFileTree([vault('v1', 'Reading')], {
      v1: [
        document('d1', 'zeta', 'v1', '/Reading/zeta.md'),
        document('d2', 'alpha', 'v1', '/Reading/alpha.md'),
      ],
    })

    expect(tree[0]?.children.map((node) => node.name)).toEqual(['alpha', 'zeta'])
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
    expect(filtered[0]?.children.map((node) => node.name)).toEqual(['notes'])
    expect(filtered[0]?.children[0]?.children[0]?.name).toBe('beta')
  })

  it('matches documents by path', () => {
    expect(filterTree(tree, 'notes/beta')[0]?.children[0]?.children[0]?.name).toBe('beta')
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterTree(tree, 'zzz')).toEqual([])
  })
})

describe('buildNotePath', () => {
  it('appends an Untitled markdown file to the base path', () => {
    expect(buildNotePath('/Reading', new Set())).toBe('/Reading/Untitled.md')
    expect(buildNotePath('/Reading/notes', new Set())).toBe('/Reading/notes/Untitled.md')
  })

  it('disambiguates against existing paths', () => {
    const existing = new Set(['/Reading/Untitled.md', '/Reading/Untitled 2.md'])

    expect(buildNotePath('/Reading', existing)).toBe('/Reading/Untitled 3.md')
  })
})

describe('buildFolderPath', () => {
  it('appends a sanitized folder segment', () => {
    expect(buildFolderPath('/Reading', 'my/folder')).toBe('/Reading/my-folder')
    expect(buildFolderPath('/Reading', '  Ideas  ')).toBe('/Reading/Ideas')
  })
})

describe('parentPath', () => {
  it('returns the containing folder of a document', () => {
    expect(parentPath('/Reading/notes/todo.md')).toBe('/Reading/notes')
    expect(parentPath('/Reading/a.md')).toBe('/Reading')
  })
})

describe('sanitizeSegment', () => {
  it('removes path separators and trims', () => {
    expect(sanitizeSegment(' a/b ')).toBe('a-b')
  })
})

describe('collect helpers', () => {
  const tree = buildFileTree([vault('v1', 'Reading')], {
    v1: [document('d1', 'b', 'v1', '/Reading/notes/b.md')],
  })

  it('collects folder paths', () => {
    expect(collectFolderPaths(tree)).toEqual(['/Reading', '/Reading/notes'])
  })

  it('collects document paths', () => {
    expect(collectDocumentPaths(tree)).toEqual(new Set(['/Reading/notes/b.md']))
  })
})

describe('resolveCreateScope', () => {
  const vaults = [vault('v1', 'Reading')]
  const tree = buildFileTree(vaults, {
    v1: [document('d1', 'b', 'v1', '/Reading/notes/b.md')],
  })

  it('uses the selected folder when there is one', () => {
    expect(resolveCreateScope(tree, vaults, '/Reading/notes', undefined)).toEqual({
      vaultId: 'v1',
      basePath: '/Reading/notes',
    })
  })

  it('falls back to the active document folder', () => {
    const active = document('d1', 'b', 'v1', '/Reading/notes/b.md')

    expect(resolveCreateScope(tree, vaults, null, active)).toEqual({
      vaultId: 'v1',
      basePath: '/Reading/notes',
    })
  })

  it('falls back to the first vault root', () => {
    expect(resolveCreateScope(tree, vaults, null, undefined)).toEqual({
      vaultId: 'v1',
      basePath: '/Reading',
    })
  })

  it('returns null when there are no vaults', () => {
    expect(resolveCreateScope([], [], null, undefined)).toBeNull()
  })
})
