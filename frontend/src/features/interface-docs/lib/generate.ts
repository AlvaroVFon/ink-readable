import type { DocOptions } from './render-markdown'
import type { SourceLanguage } from './sources'

import { renderMarkdown } from './render-markdown'
import { ParseError } from './sources'

export type GenerateResult = { ok: true; markdown: string } | { ok: false; error: string }

/**
 * Parses `source` and renders it as a Markdown interface agreement. Blank
 * input yields empty output rather than an error, so the page can start empty.
 */
export function generateDocs(
  source: string,
  language: SourceLanguage,
  options: DocOptions,
): GenerateResult {
  if (source.trim() === '') {
    return { ok: true, markdown: '' }
  }
  try {
    return { ok: true, markdown: renderMarkdown(language.parse(source), options) }
  } catch (cause) {
    if (cause instanceof ParseError) {
      return { ok: false, error: `Invalid ${language.label}: ${cause.message}` }
    }
    throw cause
  }
}
