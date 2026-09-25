import { describe, expect, it } from 'vitest'

import type { FileTreeNode } from '../types'

import {
  findVisibleIndex,
  firstChildIndex,
  flattenVisibleNodes,
  initialCursorIndex,
  moveCursor,
  parentIndex,
} from './tree-navigation'

const tree: FileTreeNode[] = [
  {
    id: 'v1',
    name: 'Reading',
    path: '/Reading',
    vaultId: 'v1',
    type: 'folder',
    children: [
      {
        id: 'd1',
        name: 'alpha',
        path: '/Reading/alpha.md',
        vaultId: 'v1',
        type: 'document',
        children: [],
      },
      {
        id: '/Reading/notes',
        name: 'notes',
        path: '/Reading/notes',
        vaultId: 'v1',
        type: 'folder',
        children: [
          {
            id: 'd2',
            name: 'beta',
            path: '/Reading/notes/beta.md',
            vaultId: 'v1',
            type: 'document',
            children: [],
          },
        ],
      },
    ],
  },
]

const allExpanded = () => true

describe('flattenVisibleNodes', () => {
  it('includes nested children with their depth', () => {
    const visible = flattenVisibleNodes(tree, allExpanded)

    expect(visible.map((entry) => entry.node.path)).toEqual([
      '/Reading',
      '/Reading/alpha.md',
      '/Reading/notes',
      '/Reading/notes/beta.md',
    ])
    expect(visible.map((entry) => entry.depth)).toEqual([0, 1, 1, 2])
  })

  it('skips the children of collapsed folders', () => {
    const visible = flattenVisibleNodes(tree, (node) => node.path !== '/Reading/notes')

    expect(visible.map((entry) => entry.node.path)).toEqual([
      '/Reading',
      '/Reading/alpha.md',
      '/Reading/notes',
    ])
  })
})

describe('cursor movement', () => {
  const visible = flattenVisibleNodes(tree, allExpanded)

  it('clamps movement to the visible range', () => {
    expect(moveCursor(visible, 0, -1)).toBe(0)
    expect(moveCursor(visible, visible.length - 1, 1)).toBe(visible.length - 1)
  })

  it('enters the list from the matching end when there is no cursor', () => {
    expect(moveCursor(visible, -1, 1)).toBe(0)
    expect(moveCursor(visible, -1, -1)).toBe(visible.length - 1)
  })

  it('finds the closest ancestor', () => {
    const betaIndex = findVisibleIndex(visible, '/Reading/notes/beta.md')

    expect(visible[parentIndex(visible, betaIndex)].node.path).toBe('/Reading/notes')
    expect(parentIndex(visible, 0)).toBe(0)
  })

  it('finds the first child only when the next row is deeper', () => {
    const readingIndex = findVisibleIndex(visible, '/Reading')
    const alphaIndex = findVisibleIndex(visible, '/Reading/alpha.md')

    expect(visible[firstChildIndex(visible, readingIndex)].node.path).toBe('/Reading/alpha.md')
    expect(firstChildIndex(visible, alphaIndex)).toBe(alphaIndex)
  })

  it('picks the preferred path when visible, otherwise the first row', () => {
    expect(initialCursorIndex(visible, '/Reading/notes')).toBe(2)
    expect(initialCursorIndex(visible, '/missing')).toBe(0)
  })
})
