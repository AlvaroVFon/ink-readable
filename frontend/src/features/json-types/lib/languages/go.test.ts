import { describe, expect, it } from 'vitest'

import { inferSchema } from '../infer'
import { go } from './go'

const sample = {
  id: 1,
  avatar_url: 'https://x',
  score: 9.5,
  tags: ['a'],
  owner: { login: 'ada' },
  items: [
    { sku: 'x', note: null },
    { sku: 'y', qty: 2, note: 'n' },
  ],
  mixed: [1, 'two'],
}

describe('go', () => {
  it('emits aligned structs with json tags', () => {
    expect(
      go.emit(inferSchema(sample, 'order'), { omitempty: true, pointersForOptional: true }),
    ).toBe(
      `type Order struct {
\tID        int64    \`json:"id"\`
\tAvatarURL string   \`json:"avatar_url"\`
\tScore     float64  \`json:"score"\`
\tTags      []string \`json:"tags"\`
\tOwner     Owner    \`json:"owner"\`
\tItems     []Item   \`json:"items"\`
\tMixed     []any    \`json:"mixed"\`
}

type Owner struct {
\tLogin string \`json:"login"\`
}

type Item struct {
\tSku  string  \`json:"sku"\`
\tNote *string \`json:"note"\`
\tQty  *int64  \`json:"qty,omitempty"\`
}
`,
    )
  })

  it('drops omitempty and pointers when disabled', () => {
    const schema = inferSchema([{ a: 1 }, { a: 2, b: 'x' }], 'Root')

    expect(go.emit(schema, { omitempty: false, pointersForOptional: false })).toBe(
      `type Root []RootElement

type RootElement struct {
\tA int64  \`json:"a"\`
\tB string \`json:"b"\`
}
`,
    )
  })

  it('handles empty objects and colliding field names', () => {
    expect(
      go.emit(inferSchema({ meta: {}, user_id: 1, userId: 2 }, 'Root'), {
        omitempty: true,
        pointersForOptional: true,
      }),
    ).toBe(
      `type Root struct {
\tMeta    Meta  \`json:"meta"\`
\tUserID  int64 \`json:"user_id"\`
\tUserID2 int64 \`json:"userId"\`
}

type Meta struct{}
`,
    )
  })
})
