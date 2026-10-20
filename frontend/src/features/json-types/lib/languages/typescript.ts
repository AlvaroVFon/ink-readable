import type { Schema, TypeDef, TypeRef } from '../ir'
import type { LanguageOptions, TargetLanguage } from './types'

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const PRIMITIVES = {
  string: 'string',
  integer: 'number',
  number: 'number',
  boolean: 'boolean',
  any: 'unknown',
} as const

function renderType(type: TypeRef): string {
  switch (type.kind) {
    case 'primitive':
      return PRIMITIVES[type.name]
    case 'null':
      return 'null'
    case 'object':
      return type.ref
    case 'array': {
      const items = renderType(type.items)
      return type.items.kind === 'union' ? `(${items})[]` : `${items}[]`
    }
    case 'union':
      break
  }
  return type.members.map(renderType).join(' | ')
}

function renderKey(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key)
}

function renderDef(def: TypeDef, declaration: string): string {
  const body = def.fields
    .map(
      (field) =>
        `  ${renderKey(field.jsonKey)}${field.optional ? '?' : ''}: ${renderType(field.type)}`,
    )
    .join('\n')
  const block = body === '' ? '{}' : `{\n${body}\n}`
  return declaration === 'type'
    ? `export type ${def.name} = ${block}`
    : `export interface ${def.name} ${block}`
}

function emit(schema: Schema, options: LanguageOptions): string {
  const blocks: string[] = []
  const rootIsDef = schema.root.kind === 'object' && schema.root.ref === schema.rootName
  if (!rootIsDef) {
    blocks.push(`export type ${schema.rootName} = ${renderType(schema.root)}`)
  }
  for (const def of schema.types) {
    blocks.push(renderDef(def, String(options.declaration)))
  }
  return `${blocks.join('\n\n')}\n`
}

export const typescript: TargetLanguage = {
  id: 'typescript',
  label: 'TypeScript',
  options: [
    {
      kind: 'select',
      key: 'declaration',
      label: 'Declare as',
      default: 'interface',
      choices: [
        { value: 'interface', label: 'interface' },
        { value: 'type', label: 'type' },
      ],
    },
  ],
  loadHighlighting: async () => {
    const { javascript } = await import('@codemirror/lang-javascript')
    return javascript({ typescript: true })
  },
  emit,
}
