import { describe, expect, it } from 'vitest'

import type { Declaration, Field } from '../model'

import { ParseError } from './scanner'
import { typescript } from './typescript'

function parse(source: string): Declaration[] {
  return typescript.parse(source).declarations
}

function fieldsOf(source: string): Field[] {
  const [declaration] = parse(source)
  if (declaration?.kind !== 'object') {
    throw new Error('expected an object declaration')
  }
  return declaration.fields
}

function field(overrides: Partial<Field> & Pick<Field, 'name' | 'type'>): Field {
  return {
    required: true,
    nullable: false,
    description: '',
    deprecated: null,
    example: null,
    examples: [],
    defaultValue: null,
    ...overrides,
  }
}

const STRING = { kind: 'primitive', name: 'string' } as const

describe('typescript source', () => {
  it('parses interfaces with docs, optional and nullable fields', () => {
    expect(
      parse(`
        /** A user. */
        export interface User extends Entity, Timestamps {
          /** Login e-mail. @example "a@b.c" */
          email: string
          name?: string // Display name.
          readonly avatar: string | null
          nickname: string | undefined
        }
      `),
    ).toEqual([
      {
        kind: 'object',
        name: 'User',
        description: 'A user.',
        deprecated: null,
        extends: ['Entity', 'Timestamps'],
        additionalProperties: null,
        fields: [
          field({
            name: 'email',
            type: STRING,
            description: 'Login e-mail.',
            example: '"a@b.c"',
            examples: ['"a@b.c"'],
          }),
          field({ name: 'name', type: STRING, required: false, description: 'Display name.' }),
          field({ name: 'avatar', type: STRING, nullable: true }),
          field({ name: 'nickname', type: STRING, required: false }),
        ],
      },
    ])
  })

  it('maps collections, dates, literals and references', () => {
    const fields = fieldsOf(`
      type Order = {
        items: Item[]
        ids: Array<number>
        meta: Record<string, unknown>
        at: Date
        kind: 'a' | 'b'
        page: Partial<Page>
        "content-type": string;
        nested: { sku: string; qty?: number }
        pair: [string, number]
      }
    `)

    expect(fields.map((entry) => [entry.name, entry.type])).toEqual([
      ['items', { kind: 'array', items: { kind: 'ref', name: 'Item', args: [] } }],
      ['ids', { kind: 'array', items: { kind: 'primitive', name: 'number' } }],
      ['meta', { kind: 'map', values: { kind: 'primitive', name: 'any' } }],
      ['at', { kind: 'primitive', name: 'string', format: 'date-time' }],
      [
        'kind',
        {
          kind: 'union',
          members: [
            { kind: 'literal', value: 'a' },
            { kind: 'literal', value: 'b' },
          ],
        },
      ],
      ['page', { kind: 'ref', name: 'Partial', args: [{ kind: 'ref', name: 'Page', args: [] }] }],
      ['content-type', STRING],
      [
        'nested',
        {
          kind: 'object',
          fields: [
            field({ name: 'sku', type: STRING }),
            field({ name: 'qty', type: { kind: 'primitive', name: 'number' }, required: false }),
          ],
        },
      ],
      [
        'pair',
        {
          kind: 'array',
          items: { kind: 'union', members: [STRING, { kind: 'primitive', name: 'number' }] },
        },
      ],
    ])
  })

  it('turns literal unions and enums into enums', () => {
    expect(
      parse(`
        type Status = 'on' | 'off'
        enum Level { Low, High = 10, Max }
        export const enum Color {
          /** Warm. */
          Red = 'red',
          Blue = 'blue', // Cold.
        }
      `),
    ).toEqual([
      {
        kind: 'enum',
        name: 'Status',
        description: '',
        deprecated: null,
        values: [
          { value: 'on', name: null, description: '' },
          { value: 'off', name: null, description: '' },
        ],
      },
      {
        kind: 'enum',
        name: 'Level',
        description: '',
        deprecated: null,
        values: [
          { value: 0, name: 'Low', description: '' },
          { value: 10, name: 'High', description: '' },
          { value: 11, name: 'Max', description: '' },
        ],
      },
      {
        kind: 'enum',
        name: 'Color',
        description: '',
        deprecated: null,
        values: [
          { value: 'red', name: 'Red', description: 'Warm.' },
          { value: 'blue', name: 'Blue', description: 'Cold.' },
        ],
      },
    ])
  })

  it('treats intersections with object literals as extension', () => {
    const [declaration] = parse('type Admin = User & { role: string }')

    expect(declaration).toMatchObject({
      kind: 'object',
      extends: ['User'],
      fields: [field({ name: 'role', type: STRING })],
    })
  })

  it('reads index signatures as additional properties', () => {
    expect(parse('interface Bag { [key: string]: number }')[0]).toMatchObject({
      kind: 'object',
      fields: [],
      additionalProperties: { kind: 'primitive', name: 'number' },
    })
  })

  it('skips imports, functions, classes and methods', () => {
    const declarations = parse(`
      import { Thing } from './thing'
      import type { Other } from "./other";
      export function load(id: string): Promise<User> { return fetch(id) }
      export class Service { run() {} }
      export const LIMIT = 10
      interface User {
        id: string
        save(): void
        onChange?: (value: string) => void
      }
    `)

    expect(declarations.map((declaration) => declaration.name)).toEqual(['User'])
    const [user] = declarations
    expect(user.kind === 'object' && user.fields.map((entry) => entry.name)).toEqual([
      'id',
      'onChange',
    ])
  })

  it('keeps fields named after keywords', () => {
    expect(fieldsOf('interface A { type: string; readonly: boolean }').map((f) => f.name)).toEqual([
      'type',
      'readonly',
    ])
  })

  it('reports syntax errors with their line', () => {
    expect(() => parse('interface User {\n  id: string\n')).toThrow(ParseError)
    expect(() => parse('interface User {\n  id: = \n}')).toThrow('Line 2')
  })
})
