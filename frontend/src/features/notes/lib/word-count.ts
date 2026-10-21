/**
 * Approximate word count of the note body. Frontmatter is metadata, so it does
 * not count; numbers and words joined by punctuation do.
 *
 * It strips the frontmatter with a regex instead of parsing YAML: this runs on
 * every keystroke, and the count only needs the body.
 */
const FRONTMATTER_PATTERN = /^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

export function countWords(content: string): number {
  const body = content.replace(FRONTMATTER_PATTERN, '')
  const matches = body.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)
  return matches?.length ?? 0
}
