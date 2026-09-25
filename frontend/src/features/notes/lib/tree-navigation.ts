import type { FileTreeNode } from '../types'

/** A tree node paired with its indentation depth in the visible tree. */
export type VisibleNode = {
  node: FileTreeNode
  depth: number
}

/**
 * Flattens the tree to the nodes that are currently visible, in render order.
 *
 * A folder contributes its children only while `isExpanded` returns true for
 * it, which is how collapsed folders are skipped by keyboard navigation.
 */
export function flattenVisibleNodes(
  nodes: FileTreeNode[],
  isExpanded: (node: FileTreeNode) => boolean,
  depth = 0,
): VisibleNode[] {
  const result: VisibleNode[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.type === 'folder' && isExpanded(node)) {
      result.push(...flattenVisibleNodes(node.children, isExpanded, depth + 1))
    }
  }
  return result
}

/** Index of the visible entry with `path`, or -1 when it is not visible. */
export function findVisibleIndex(visible: VisibleNode[], path: string | null): number {
  if (path === null) {
    return -1
  }
  return visible.findIndex((entry) => entry.node.path === path)
}

/**
 * Moves the cursor by `delta` rows, clamped to the visible range. An index of
 * -1 (no cursor yet) steps into the list from the matching end.
 */
export function moveCursor(visible: VisibleNode[], index: number, delta: number): number {
  if (visible.length === 0) {
    return -1
  }
  if (index < 0) {
    return delta > 0 ? 0 : visible.length - 1
  }
  return Math.min(Math.max(index + delta, 0), visible.length - 1)
}

/** Index of the closest ancestor of the entry at `index` (itself if none). */
export function parentIndex(visible: VisibleNode[], index: number): number {
  if (index <= 0) {
    return index
  }
  const depth = visible[index].depth
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (visible[cursor].depth < depth) {
      return cursor
    }
  }
  return index
}

/** Index of the first child of the entry at `index` (itself if it has none). */
export function firstChildIndex(visible: VisibleNode[], index: number): number {
  const next = index + 1
  if (next < visible.length && visible[next].depth > visible[index].depth) {
    return next
  }
  return index
}

/**
 * Picks the initial cursor: the preferred path when visible, otherwise the
 * first row.
 */
export function initialCursorIndex(visible: VisibleNode[], preferredPath: string | null): number {
  const found = findVisibleIndex(visible, preferredPath)
  if (found !== -1) {
    return found
  }
  return visible.length > 0 ? 0 : -1
}
