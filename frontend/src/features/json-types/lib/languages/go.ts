import type { Schema, TypeDef, TypeRef } from '../ir'
import type { LanguageOptions, TargetLanguage } from './types'

import { splitNullable } from '../ir'
import { toGoIdentifier, uniqueName } from '../naming'

const PRIMITIVES = {
  string: 'string',
  integer: 'int64',
  number: 'float64',
  boolean: 'bool',
  any: 'any',
} as const

/**
 * Go type for `type`. Nullable values (and optional ones when `pointer` is set)
 * become pointers, except for types that already have a nil value.
 */
function renderType(type: TypeRef, pointer: boolean): string {
  const { type: inner, nullable } = splitNullable(type)
  let base: string
  switch (inner.kind) {
    case 'primitive':
      base = PRIMITIVES[inner.name]
      break
    case 'object':
      base = toGoIdentifier(inner.ref)
      break
    case 'array':
      base = `[]${renderType(inner.items, false)}`
      break
    // A bare `null` or a mix of types has no Go type more precise than `any`.
    case 'null':
    case 'union':
      base = 'any'
      break
  }
  const nilable = base === 'any' || base.startsWith('[]')
  return (nullable || pointer) && !nilable ? `*${base}` : base
}

/** Lays out rows in columns padded to the widest cell, like gofmt does. */
function alignColumns(rows: string[][]): string[] {
  const widths: number[] = []
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length)
    })
  }
  return rows.map((row) =>
    row
      .map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index])))
      .join(' '),
  )
}

function renderStruct(def: TypeDef, options: LanguageOptions): string {
  const name = toGoIdentifier(def.name)
  if (def.fields.length === 0) {
    return `type ${name} struct{}`
  }
  const usedNames = new Set<string>()
  const rows = def.fields.map((field) => {
    const fieldName = uniqueName(toGoIdentifier(field.jsonKey), usedNames)
    const type = renderType(field.type, field.optional && options.pointersForOptional === true)
    const omitempty = field.optional && options.omitempty === true ? ',omitempty' : ''
    return [fieldName, type, `\`json:"${field.jsonKey}${omitempty}"\``]
  })
  const lines = alignColumns(rows).map((line) => `\t${line}`)
  return `type ${name} struct {\n${lines.join('\n')}\n}`
}

function emit(schema: Schema, options: LanguageOptions): string {
  const blocks: string[] = []
  const rootIsDef = schema.root.kind === 'object' && schema.root.ref === schema.rootName
  if (!rootIsDef) {
    blocks.push(`type ${toGoIdentifier(schema.rootName)} ${renderType(schema.root, false)}`)
  }
  for (const def of schema.types) {
    blocks.push(renderStruct(def, options))
  }
  return `${blocks.join('\n\n')}\n`
}

export const go: TargetLanguage = {
  id: 'go',
  label: 'Go',
  options: [
    { kind: 'boolean', key: 'omitempty', label: 'omitempty on optional fields', default: true },
    {
      kind: 'boolean',
      key: 'pointersForOptional',
      label: 'Pointers for optional fields',
      default: true,
    },
  ],
  loadHighlighting: async () => {
    const { go: goLanguage } = await import('@codemirror/lang-go')
    return goLanguage()
  },
  emit,
}
