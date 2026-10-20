import { describe, expect, it } from 'vitest'

import type { Declaration, Field } from '../model'

import { go } from './go'
import { ParseError } from './scanner'

function parse(source: string): Declaration[] {
  return go.parse(source).declarations
}

function fieldsOf(source: string): Field[] {
  const declaration = parse(source).find((entry) => entry.kind === 'object')
  if (declaration?.kind !== 'object') {
    throw new Error('expected a struct')
  }
  return declaration.fields
}

describe('go source', () => {
  it('names fields after json tags and skips hidden ones', () => {
    const fields = fieldsOf(`
      package api

      // User is an account.
      type User struct {
        ID       string \`json:"id"\` // Unique id.
        UserName string
        Secret   string \`json:"-"\`
        Dash     string \`json:"-,"\`
        internal string
        A, B     int    \`json:",omitempty"\`
      }
    `)

    expect(fields.map((field) => [field.name, field.required, field.description])).toEqual([
      ['id', true, 'Unique id.'],
      ['UserName', true, ''],
      ['-', true, ''],
      ['A', false, ''],
      ['B', false, ''],
    ])
  })

  it('derives required and nullable from pointers, omitempty and validation tags', () => {
    const fields = fieldsOf(`
      type T struct {
        Ptr      *string \`json:"ptr"\`
        PtrOmit  *string \`json:"ptrOmit,omitempty"\`
        Omit     string  \`json:"omit,omitempty"\`
        Needed   string  \`json:"needed,omitempty" validate:"required,email"\`
        Count    int64   \`json:"count,string"\`
      }
    `)

    expect(
      fields.map((field) => [field.name, field.required, field.nullable, field.type.kind]),
    ).toEqual([
      ['ptr', true, true, 'primitive'],
      ['ptrOmit', false, false, 'primitive'],
      ['omit', false, false, 'primitive'],
      ['needed', true, false, 'primitive'],
      ['count', true, false, 'primitive'],
    ])
    expect(fields[4].type).toEqual({ kind: 'primitive', name: 'string' })
  })

  it('maps Go types to wire types', () => {
    const fields = fieldsOf(`
      import (
        "time"
        "encoding/json"
      )

      type T struct {
        Count   int32             \`json:"count"\`
        Price   float64           \`json:"price"\`
        At      time.Time         \`json:"at"\`
        Raw     json.RawMessage   \`json:"raw"\`
        Data    []byte            \`json:"data"\`
        Items   []*Item           \`json:"items"\`
        Labels  map[string]string \`json:"labels"\`
        Money   money.Amount      \`json:"money"\`
        Page    Page[Item]        \`json:"page"\`
        Any     interface{}       \`json:"any"\`
        Inline  struct {
          Sku string \`json:"sku"\`
        } \`json:"inline"\`
      }
    `)

    expect(Object.fromEntries(fields.map((field) => [field.name, field.type]))).toEqual({
      count: { kind: 'primitive', name: 'integer', format: 'int32' },
      price: { kind: 'primitive', name: 'number', format: 'double' },
      at: { kind: 'primitive', name: 'string', format: 'date-time' },
      raw: { kind: 'primitive', name: 'any' },
      data: { kind: 'primitive', name: 'string', format: 'base64' },
      items: {
        kind: 'array',
        items: {
          kind: 'union',
          members: [{ kind: 'ref', name: 'Item', args: [] }, { kind: 'null' }],
        },
      },
      labels: { kind: 'map', values: { kind: 'primitive', name: 'string' } },
      money: { kind: 'ref', name: 'money.Amount', args: [] },
      page: { kind: 'ref', name: 'Page', args: [{ kind: 'ref', name: 'Item', args: [] }] },
      any: { kind: 'primitive', name: 'any' },
      inline: {
        kind: 'object',
        fields: [expect.objectContaining({ name: 'sku' })],
      },
    })
  })

  it('treats embedded structs as extension unless the tag names them', () => {
    const [declaration] = parse(`
      type Admin struct {
        User
        *Audit
        base.Model
        Meta \`json:"meta"\`
        Role string \`json:"role"\`
      }
    `)

    expect(declaration).toMatchObject({
      kind: 'object',
      extends: ['User', 'Audit', 'base.Model'],
      fields: [{ name: 'meta' }, { name: 'role' }],
    })
  })

  it('collects typed constants as enum values', () => {
    const declarations = parse(`
      // Status of an order.
      type Status string

      const (
        // Waiting for payment.
        StatusPending Status = "pending"
        StatusPaid    Status = "paid" // Paid in full.
        unrelated            = "x"
      )

      type Priority int

      const (
        Low Priority = iota + 1
        Medium
        High
      )

      const Single Status = "single"

      type Plain string
    `)

    expect(declarations).toEqual([
      {
        kind: 'enum',
        name: 'Status',
        description: 'Status of an order.',
        deprecated: null,
        values: [
          { value: 'pending', name: 'StatusPending', description: 'Waiting for payment.' },
          { value: 'paid', name: 'StatusPaid', description: 'Paid in full.' },
          { value: 'single', name: 'Single', description: '' },
        ],
      },
      {
        kind: 'enum',
        name: 'Priority',
        description: '',
        deprecated: null,
        values: [
          { value: 1, name: 'Low', description: '' },
          { value: 2, name: 'Medium', description: '' },
          { value: 3, name: 'High', description: '' },
        ],
      },
      {
        kind: 'alias',
        name: 'Plain',
        description: '',
        deprecated: null,
        type: { kind: 'primitive', name: 'string' },
      },
    ])
  })

  it('reads Deprecated: paragraphs, type groups and skips functions', () => {
    const declarations = parse(`
      func (u *User) Save(ctx context.Context) (map[string]struct{}, error) {
        type local struct{ X int }
        return nil, nil
      }

      type (
        // Deprecated: use V2.
        V1 struct {
          // Name of it.
          // Deprecated: use Title.
          Name string \`json:"name"\`
        }
        Labels map[string]string
      )
    `)

    expect(declarations).toMatchObject([
      {
        kind: 'object',
        name: 'V1',
        deprecated: 'use V2.',
        fields: [{ name: 'name', description: 'Name of it.', deprecated: 'use Title.' }],
      },
      { kind: 'object', name: 'Labels', additionalProperties: { kind: 'primitive' } },
    ])
  })

  it('reports syntax errors with their line', () => {
    expect(() => parse('type User struct {\n  ID string\n')).toThrow(ParseError)
  })
})
