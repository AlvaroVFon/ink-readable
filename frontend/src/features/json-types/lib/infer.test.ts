import { describe, expect, it } from 'vitest'

import { inferSchema } from './infer'

describe('inferSchema', () => {
  it('names nested objects after their key', () => {
    const schema = inferSchema({ id: 1, profile: { name: 'Ada' } }, 'user')

    expect(schema.rootName).toBe('User')
    expect(schema.root).toEqual({ kind: 'object', ref: 'User' })
    expect(schema.types).toEqual([
      {
        name: 'User',
        fields: [
          { jsonKey: 'id', type: { kind: 'primitive', name: 'integer' }, optional: false },
          { jsonKey: 'profile', type: { kind: 'object', ref: 'Profile' }, optional: false },
        ],
      },
      {
        name: 'Profile',
        fields: [{ jsonKey: 'name', type: { kind: 'primitive', name: 'string' }, optional: false }],
      },
    ])
  })

  it('merges array elements, marking missing fields optional and nulls nullable', () => {
    const schema = inferSchema(
      {
        users: [
          { id: 1, email: 'a@b.c' },
          { id: 2, email: null, admin: true },
        ],
      },
      'Root',
    )

    expect(schema.types[1]).toEqual({
      name: 'User',
      fields: [
        { jsonKey: 'id', type: { kind: 'primitive', name: 'integer' }, optional: false },
        {
          jsonKey: 'email',
          type: {
            kind: 'union',
            members: [{ kind: 'primitive', name: 'string' }, { kind: 'null' }],
          },
          optional: false,
        },
        { jsonKey: 'admin', type: { kind: 'primitive', name: 'boolean' }, optional: true },
      ],
    })
  })

  it('widens integers to numbers when any value is fractional', () => {
    const schema = inferSchema([{ price: 1 }, { price: 1.5 }], 'Root')

    expect(schema.types[0].fields[0].type).toEqual({ kind: 'primitive', name: 'number' })
  })

  it('keeps unions of different types', () => {
    const schema = inferSchema({ value: [1, 'a'] }, 'Root')

    expect(schema.types[0].fields[0].type).toEqual({
      kind: 'array',
      items: {
        kind: 'union',
        members: [
          { kind: 'primitive', name: 'string' },
          { kind: 'primitive', name: 'integer' },
        ],
      },
    })
  })

  it('types empty arrays and null-only values loosely', () => {
    const schema = inferSchema({ tags: [], deleted: null }, 'Root')

    expect(schema.types[0].fields.map((field) => field.type)).toEqual([
      { kind: 'array', items: { kind: 'primitive', name: 'any' } },
      { kind: 'null' },
    ])
  })

  it('aliases a root array to its element type', () => {
    const schema = inferSchema([{ id: 1 }], 'Root')

    expect(schema.root).toEqual({ kind: 'array', items: { kind: 'object', ref: 'RootElement' } })
    expect(schema.types.map((def) => def.name)).toEqual(['RootElement'])
  })

  it('handles primitive roots', () => {
    expect(inferSchema('hello', 'Root')).toEqual({
      rootName: 'Root',
      root: { kind: 'primitive', name: 'string' },
      types: [],
    })
  })

  it('reuses one type for structurally identical objects', () => {
    const schema = inferSchema(
      { billing: { street: 'a', city: 'b' }, shipping: { street: 'c', city: 'd' } },
      'Order',
    )

    expect(schema.types.map((def) => def.name)).toEqual(['Order', 'Billing'])
    expect(schema.types[0].fields[1].type).toEqual({ kind: 'object', ref: 'Billing' })
  })

  it('suffixes names of different objects that share a key', () => {
    const schema = inferSchema({ a: { item: { x: 1 } }, b: { item: { y: 'z' } } }, 'Root')

    expect(schema.types.map((def) => def.name)).toEqual(['Root', 'A', 'Item', 'B', 'Item2'])
  })
})
