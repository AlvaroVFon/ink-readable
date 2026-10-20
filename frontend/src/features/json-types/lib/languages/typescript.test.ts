import { describe, expect, it } from 'vitest'

import { inferSchema } from '../infer'
import { typescript } from './typescript'

const sample = {
  id: 1,
  'first-name': 'Ada',
  score: 9.5,
  tags: ['a'],
  owner: { login: 'ada' },
  items: [
    { sku: 'x', note: null },
    { sku: 'y', qty: 2, note: 'n' },
  ],
  mixed: [1, 'two'],
  extra: null,
}

describe('typescript', () => {
  it('emits interfaces', () => {
    expect(typescript.emit(inferSchema(sample, 'Order'), { declaration: 'interface' })).toBe(
      `export interface Order {
  id: number
  "first-name": string
  score: number
  tags: string[]
  owner: Owner
  items: Item[]
  mixed: (string | number)[]
  extra: null
}

export interface Owner {
  login: string
}

export interface Item {
  sku: string
  note: string | null
  qty?: number
}
`,
    )
  })

  it('emits type aliases when asked', () => {
    expect(typescript.emit(inferSchema({ a: {} }, 'Root'), { declaration: 'type' })).toBe(
      `export type Root = {
  a: A
}

export type A = {}
`,
    )
  })

  it('aliases non-object roots', () => {
    expect(typescript.emit(inferSchema([{ id: 1 }], 'Root'), { declaration: 'interface' })).toBe(
      `export type Root = RootElement[]

export interface RootElement {
  id: number
}
`,
    )
    expect(typescript.emit(inferSchema([], 'Root'), { declaration: 'interface' })).toBe(
      'export type Root = unknown[]\n',
    )
  })
})
