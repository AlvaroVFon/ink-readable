export type OutlineItem = {
  id: string
  text: string
  level: number
}

/**
 * Reads the rendered preview headings, so the outline always uses exactly the
 * ids the Markdown pipeline generated (including duplicate-heading suffixes).
 */
export function collectOutline(root: ParentNode | null): OutlineItem[] {
  if (root === null) {
    return []
  }
  const headings = root.querySelectorAll<HTMLElement>(
    '.markdown-preview h1, .markdown-preview h2, .markdown-preview h3',
  )
  return Array.from(headings)
    .filter((heading) => heading.id !== '')
    .map((heading) => ({
      id: heading.id,
      text: (heading.textContent ?? '').trim(),
      level: Number(heading.tagName.slice(1)),
    }))
}
