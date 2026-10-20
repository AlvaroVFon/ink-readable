import { Slugger } from '../lib/slugger'

/** The slice of the hast tree this plugin needs (hast types aren't a direct dependency). */
type HastNode = {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

const HEADING = /^h[1-6]$/

function textOf(node: HastNode): string {
  if (node.type === 'text') {
    return node.value ?? ''
  }
  return (node.children ?? []).map(textOf).join('')
}

function visit(node: HastNode, slugger: Slugger): void {
  for (const child of node.children ?? []) {
    if (child.type !== 'element') {
      continue
    }
    if (HEADING.test(child.tagName ?? '') && child.properties?.['id'] === undefined) {
      child.properties = { ...child.properties, id: slugger.slug(textOf(child)) }
    }
    visit(child, slugger)
  }
}

/**
 * Gives every heading an `id` using GitHub-style slugs (in document order, so
 * duplicates get `-1`, `-2`). Without ids, `[text](#heading)` links have no
 * target. Runs before `rehype-sanitize`, which keeps `id` untouched (see the
 * sanitize schema).
 */
export function rehypeHeadingIds() {
  return (tree: HastNode) => {
    visit(tree, new Slugger())
  }
}
