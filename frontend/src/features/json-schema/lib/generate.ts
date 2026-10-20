import type { SourceLanguage } from '@/features/interface-docs/lib/sources'

import { ParseError } from '@/features/interface-docs/lib/sources'
import { inferSchema } from '@/features/json-types/lib/infer'

import type { SchemaOptions } from './schema'

import { fromContract, RootNotFoundError } from './from-contract'
import { fromSample } from './from-sample'

export type GenerateResult = { ok: true; code: string } | { ok: false; error: string }

/** What the schema is generated from: a JSON sample or declarations in a language. */
export type Source = { kind: 'json' } | { kind: 'declarations'; language: SourceLanguage }

/**
 * Parses `input` and emits a JSON Schema for it. Blank input yields empty
 * output rather than an error, so the page can start empty.
 */
export function generateSchema(
  input: string,
  source: Source,
  rootName: string,
  options: SchemaOptions,
): GenerateResult {
  if (input.trim() === '') {
    return { ok: true, code: '' }
  }
  try {
    const schema =
      source.kind === 'json'
        ? fromSample(inferSchema(JSON.parse(input), rootName), options)
        : fromContract(source.language.parse(input).declarations, rootName.trim(), options)
    return { ok: true, code: JSON.stringify(schema, null, 2) }
  } catch (cause) {
    if (cause instanceof ParseError && source.kind === 'declarations') {
      return { ok: false, error: `Invalid ${source.language.label}: ${cause.message}` }
    }
    if (cause instanceof SyntaxError) {
      return { ok: false, error: `Invalid JSON: ${cause.message}` }
    }
    if (cause instanceof RootNotFoundError) {
      return { ok: false, error: cause.message }
    }
    throw cause
  }
}
