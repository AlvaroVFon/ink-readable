import type { LanguageOptions, TargetLanguage } from './languages'

import { inferSchema } from './infer'

export type GenerateResult = { ok: true; code: string } | { ok: false; error: string }

/**
 * Parses `input` and emits type definitions for it. Blank input yields empty
 * output rather than a parse error, so the page can start empty.
 */
export function generateTypes(
  input: string,
  language: TargetLanguage,
  rootName: string,
  options: LanguageOptions,
): GenerateResult {
  if (input.trim() === '') {
    return { ok: true, code: '' }
  }
  let value: unknown
  try {
    value = JSON.parse(input)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    return { ok: false, error: `Invalid JSON: ${message}` }
  }
  return { ok: true, code: language.emit(inferSchema(value, rootName), options) }
}
