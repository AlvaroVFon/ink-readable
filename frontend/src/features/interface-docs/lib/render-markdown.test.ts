import { describe, expect, it } from 'vitest'

import type { DocOptions } from './render-markdown'

import { renderMarkdown } from './render-markdown'
import { typescript } from './sources/typescript'

const OPTIONS: DocOptions = {
  title: 'Orders API',
  version: '2.1.0',
  date: '2026-10-20',
  locale: 'en',
  tableOfContents: true,
  examples: true,
}

function render(source: string, options: Partial<DocOptions> = {}): string {
  return renderMarkdown(typescript.parse(source), { ...OPTIONS, ...options })
}

describe('renderMarkdown', () => {
  it('renders a complete agreement', () => {
    expect(
      render(`
        interface Base { id: string }
        /** An order. */
        interface Order extends Base {
          /** When it was placed. */
          placedAt: Date
          status: Status
          note?: string | null
          /** @deprecated Use \`lines\`. */
          items: Line[]
        }
        interface Line {
          sku: string
          /** @default 1 */
          qty?: number
        }
        type Status = 'open' | 'closed'
      `),
    ).toBe(`# Orders API

**Version:** 2.1.0 · **Date:** 2026-10-20

## Contents

- [Data types](#data-types)
  - [Base](#base)
  - [Order](#order)
  - [Line](#line)
  - [Status](#status)

## Conventions

- **Required**: the key must always be present in the payload.
- **Nullable**: the value may be \`null\`.
- Dates and times are strings in ISO 8601 / RFC 3339 format.

## Data types

### Base

| Field | Type | Required | Nullable | Description |
| --- | --- | --- | --- | --- |
| \`id\` | \`string\` | Yes | No |  |

**Example**

\`\`\`json
{
  "id": "string"
}
\`\`\`

### Order

An order.

Includes every field of [Base](#base).

| Field | Type | Required | Nullable | Description |
| --- | --- | --- | --- | --- |
| \`id\` | \`string\` | Yes | No |  |
| \`placedAt\` | \`string\` (date-time) | Yes | No | When it was placed. |
| \`status\` | [Status](#status) | Yes | No |  |
| \`note\` | \`string\` | No | Yes |  |
| \`items\` | array of [Line](#line) | Yes | No | **Deprecated.** Use \`lines\`. |

**Example**

\`\`\`json
{
  "id": "string",
  "placedAt": "2026-01-31T09:30:00Z",
  "status": "open",
  "note": "string",
  "items": [
    {
      "sku": "string",
      "qty": 1
    }
  ]
}
\`\`\`

### Line

| Field | Type | Required | Nullable | Description |
| --- | --- | --- | --- | --- |
| \`sku\` | \`string\` | Yes | No |  |
| \`qty\` | \`number\` | No | No | Default: \`1\`. |

**Example**

\`\`\`json
{
  "sku": "string",
  "qty": 1
}
\`\`\`

### Status

Allowed values:

| Value | Description |
| --- | --- |
| \`"open"\` |  |
| \`"closed"\` |  |
`)
  })

  it('translates to Spanish and drops optional sections', () => {
    const markdown = render('interface A { tags: string[]; b?: boolean }', {
      title: '',
      version: '',
      locale: 'es',
      tableOfContents: false,
      examples: false,
    })

    expect(markdown).toBe(`# Acuerdo de interfaz

**Fecha:** 2026-10-20

## Convenciones

- **Obligatorio**: la clave debe estar siempre presente en el payload.
- **Nulable**: el valor puede ser \`null\`.

## Tipos de datos

### A

| Campo | Tipo | Obligatorio | Nulable | Descripción |
| --- | --- | --- | --- | --- |
| \`tags\` | lista de \`string\` | Sí | No |  |
| \`b\` | \`boolean\` | No | No |  |
`)
  })

  it('expands inline objects into dotted rows', () => {
    const markdown = render('interface A { address: { city: string }; lines: { sku: string }[] }', {
      examples: false,
    })

    expect(markdown).toContain('| `address` | object | Yes | No |  |')
    expect(markdown).toContain('| `address.city` | `string` | Yes | No |  |')
    expect(markdown).toContain('| `lines` | array of object | Yes | No |  |')
    expect(markdown).toContain('| `lines[].sku` | `string` | Yes | No |  |')
  })

  it('escapes pipes and line breaks inside table cells', () => {
    const markdown = render(
      `interface A {
        /**
         * Either a | b.
         * Second line.
         */
        kind: 'a' | 'b'
      }`,
      { examples: false },
    )

    expect(markdown).toContain(
      '| `kind` | `"a"` or `"b"` | Yes | No | Either a \\| b. Second line. |',
    )
  })

  it('shows names for numeric enums and links only declared types', () => {
    const markdown = render(
      `enum Level { Low = 1, High }
       interface A { level: Level; ext: External }`,
      { examples: false },
    )

    expect(markdown).toContain('| `1` | `Low` |  |')
    expect(markdown).toContain('| `level` | [Level](#level) |')
    expect(markdown).toContain('| `ext` | `External` |')
  })

  it('stops examples at recursive references', () => {
    const markdown = render('interface Node { name: string; children: Node[]; parent?: Node }')

    expect(markdown).toContain(`{
  "name": "string",
  "children": [],
  "parent": {}
}`)
  })

  it('gives duplicate headings distinct anchors', () => {
    expect(render('interface Contents { a: string }')).toContain('  - [Contents](#contents-1)')
  })

  it('says so when there is nothing to document', () => {
    expect(render('const x = 1')).toContain('## Data types\n\n_No declarations found._\n')
  })
})

describe('multiple examples', () => {
  const SOURCE = `
    interface Order {
      /** @example "open" @example "closed" */
      status: string
      meta: { qty: number; note: string }
    }
  `

  it('renders one block per documented @example', () => {
    const output = render(SOURCE)

    expect(output).toContain('**Example: 1**')
    expect(output).toContain('**Example: 2**')
    expect(output).toContain('"status": "open"')
    expect(output).toContain('"status": "closed"')
  })

  it('counts @example tags of nested and referenced objects', () => {
    const output = render(`
      interface Address {
        /** @example "Madrid" @example "Oslo" */
        city: string
      }
      interface User {
        address: Address
        meta: {
          /** @example 1 @example 2 @example 3 */
          n: number
        }
      }
    `)

    expect(output).toContain('**Example: 3**')
    expect(output).toMatch(/"city": "Oslo"[\s\S]*"n": 2/)
  })
})
