import { describe, expect, it } from 'vitest'

import { parseDocText, splitNullable } from './model'

describe('parseDocText', () => {
  it('splits the description from known tags', () => {
    expect(
      parseDocText('Display name.\nShown to partners. @example "Ada"\n@deprecated Use `title`.'),
    ).toEqual({
      description: 'Display name.\nShown to partners.',
      example: '"Ada"',
      deprecated: 'Use `title`.',
      defaultValue: null,
    })
  })

  it('accepts @defaultValue and leaves unknown tags and e-mails alone', () => {
    expect(parseDocText('Contact ops@example.com. @see Docs @defaultValue 3')).toEqual({
      description: 'Contact ops@example.com. @see Docs',
      example: null,
      deprecated: null,
      defaultValue: '3',
    })
  })

  it('reads a bare @deprecated as an empty reason', () => {
    expect(parseDocText('@deprecated').deprecated).toBe('')
  })
})

describe('splitNullable', () => {
  it('removes null from unions', () => {
    const string = { kind: 'primitive', name: 'string' } as const

    expect(splitNullable({ kind: 'union', members: [string, { kind: 'null' }] })).toEqual({
      type: string,
      nullable: true,
    })
    expect(splitNullable(string)).toEqual({ type: string, nullable: false })
  })
})
