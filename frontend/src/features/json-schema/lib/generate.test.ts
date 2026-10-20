/* oxlint-disable typescript/no-unsafe-member-access, typescript/no-unsafe-assignment, typescript/no-unsafe-return -- parsed schemas are inspected loosely */
import { describe, expect, it } from 'vitest'

import { getSourceLanguage } from '@/features/interface-docs/lib/sources'

import type { SchemaOptions } from './schema'

import { generateSchema } from './generate'

const OPTIONS: SchemaOptions = { draft: '2020-12', strict: false }

function fromJson(input: string, options = OPTIONS, rootName = '') {
  const result = generateSchema(input, { kind: 'json' }, rootName, options)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return JSON.parse(result.code)
}

function fromSource(input: string, sourceId = 'typescript', options = OPTIONS, rootName = '') {
  const result = generateSchema(
    input,
    { kind: 'declarations', language: getSourceLanguage(sourceId) },
    rootName,
    options,
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return JSON.parse(result.code)
}

describe('from a JSON sample', () => {
  const sample = JSON.stringify({
    id: 1,
    email: null,
    tags: ['a'],
    address: { city: 'x' },
    projects: [{ title: 't' }, { title: 'u', pages: 2 }],
  })

  it('infers types, required keys and nullability', () => {
    const schema = fromJson(sample)

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(schema.title).toBe('Root')
    expect(schema.type).toBe('object')
    expect(schema.required).toEqual(['id', 'email', 'tags', 'address', 'projects'])
    expect(schema.properties.id).toEqual({ type: 'integer' })
    expect(schema.properties.email).toEqual({ type: 'null' })
    expect(schema.properties.tags).toEqual({ type: 'array', items: { type: 'string' } })
    expect(schema.properties.address).toEqual({ $ref: '#/$defs/Address' })
    expect(schema.$defs.Project.required).toEqual(['title'])
    expect(schema.$defs.Project.properties.pages).toEqual({ type: 'integer' })
  })

  it('uses definitions and the draft 07 URI in draft 07', () => {
    const schema = fromJson(sample, { draft: '07', strict: false })

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#')
    expect(schema.properties.address).toEqual({ $ref: '#/definitions/Address' })
    expect(schema.definitions.Address).toBeDefined()
    expect(schema.$defs).toBeUndefined()
  })

  it('forbids additional properties when strict', () => {
    const schema = fromJson(sample, { draft: '2020-12', strict: true })

    expect(schema.additionalProperties).toBe(false)
    expect(schema.$defs.Address.additionalProperties).toBe(false)
  })

  it('merges primitives into a type list', () => {
    const schema = fromJson('[{"v":1},{"v":"a"},{"v":null}]')

    expect(schema.type).toBe('array')
    expect(schema.items.$ref).toBe('#/$defs/RootElement')
    expect(schema.$defs.RootElement.properties.v).toEqual({ type: ['string', 'integer', 'null'] })
  })

  it('reports invalid JSON and accepts blank input', () => {
    const invalid = generateSchema('{', { kind: 'json' }, '', OPTIONS)
    expect(invalid).toMatchObject({ ok: false })
    expect(generateSchema('  ', { kind: 'json' }, '', OPTIONS)).toEqual({ ok: true, code: '' })
  })
})

describe('from TypeScript', () => {
  const source = `
    type Status = 'open' | 'closed'
    interface Base { id: string }
    /** An order. */
    interface Order extends Base {
      /** Lifecycle state. @example "open" */
      status: Status
      /** Units. @default 1 */
      qty?: number
      note: string | null
      /** @deprecated use items */
      lines?: Line[]
      at: Date
      meta: Record<string, number>
    }
    interface Line { sku: string; parent?: Order }
  `

  it('maps fields, docs, enums and references', () => {
    const schema = fromSource(source, 'typescript', OPTIONS, 'Order')

    expect(schema.title).toBe('Order')
    expect(schema.description).toBe('An order.')
    expect(schema.required).toEqual(['id', 'status', 'note', 'at', 'meta'])
    expect(schema.properties.id).toEqual({ type: 'string' })
    expect(schema.properties.status).toEqual({
      $ref: '#/$defs/Status',
      description: 'Lifecycle state.',
      examples: ['open'],
    })
    expect(schema.$defs.Status).toEqual({ type: 'string', enum: ['open', 'closed'] })
    expect(schema.properties.qty).toEqual({ type: 'number', description: 'Units.', default: 1 })
    expect(schema.properties.note).toEqual({ type: ['string', 'null'] })
    expect(schema.properties.lines).toMatchObject({ type: 'array', deprecated: true })
    expect(schema.properties.at).toEqual({ type: 'string', format: 'date-time' })
    expect(schema.properties.meta).toEqual({
      type: 'object',
      additionalProperties: { type: 'number' },
    })
  })

  it('points back at the root with #', () => {
    const schema = fromSource(source, 'typescript', OPTIONS, 'Order')

    expect(schema.$defs.Line.properties.parent).toEqual({ $ref: '#' })
  })

  it('defaults to the first declaration and reports unknown roots', () => {
    expect(fromSource('interface A { a: string } interface B { b: string }').title).toBe('A')
    const result = generateSchema(
      'interface A { a: string }',
      { kind: 'declarations', language: getSourceLanguage('typescript') },
      'Nope',
      OPTIONS,
    )
    expect(result).toEqual({ ok: false, error: 'Type "Nope" is not declared' })
  })

  it('wraps annotated references in draft 07', () => {
    const schema = fromSource(source, 'typescript', { draft: '07', strict: false }, 'Order')

    expect(schema.properties.status).toEqual({
      allOf: [{ $ref: '#/definitions/Status' }],
      description: 'Lifecycle state.',
      examples: ['open'],
    })
    expect(schema.properties.lines.deprecated).toBeUndefined()
  })
})

describe('from Go', () => {
  it('uses json tags, omitempty and pointers', () => {
    const schema = fromSource(
      `type User struct {
        ID   string  \`json:"id"\`
        Name *string \`json:"name"\`
        Nick string  \`json:"nick,omitempty"\`
      }`,
      'go',
    )

    expect(schema.required).toEqual(['id', 'name'])
    expect(schema.properties.nick).toEqual({ type: 'string' })
    expect(schema.properties.name).toEqual({ type: ['string', 'null'] })
  })

  it('reports invalid source', () => {
    const result = generateSchema(
      'type X struct {',
      { kind: 'declarations', language: getSourceLanguage('go') },
      '',
      OPTIONS,
    )
    expect(result).toMatchObject({ ok: false })
  })
})
