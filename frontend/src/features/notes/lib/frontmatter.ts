import { parse } from 'yaml'

export type Frontmatter = {
  /** The YAML source between the fences, without them. */
  raw: string
  /** Parsed mapping, or `null` when the YAML is invalid or not a mapping. */
  data: Record<string, unknown> | null
}

export type SplitFrontmatter = {
  frontmatter: Frontmatter | null
  body: string
}

/**
 * A YAML block at the very start of the document, opened by `---` and closed by
 * `---` or `...` on their own lines (the Jekyll / Obsidian convention).
 */
const FRONTMATTER_PATTERN = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseYaml(raw: string): Record<string, unknown> | null {
  try {
    const data: unknown = parse(raw)
    return isRecord(data) ? data : null
  } catch {
    return null
  }
}

/**
 * Separates the frontmatter from the markdown body.
 *
 * Without it the preview renders the opening fence as a thematic break and the
 * closing one as a setext heading underline. Invalid YAML is still split off so
 * the body renders normally; callers can fall back to `raw`.
 */
export function splitFrontmatter(content: string): SplitFrontmatter {
  const match = FRONTMATTER_PATTERN.exec(content)
  if (match === null) {
    return { frontmatter: null, body: content }
  }
  const raw = match[1] ?? ''
  return {
    frontmatter: { raw, data: parseYaml(raw) },
    body: content.slice(match[0].length),
  }
}
