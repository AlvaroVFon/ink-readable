import { describe, expect, it } from 'vitest'

import { splitFrontmatter } from './frontmatter'

describe('splitFrontmatter', () => {
  it('parses a YAML mapping and returns the body', () => {
    const result = splitFrontmatter('---\ntitle: Hello\ntags: [a, b]\n---\n# Body\n')

    expect(result.frontmatter?.data).toEqual({ title: 'Hello', tags: ['a', 'b'] })
    expect(result.frontmatter?.raw).toBe('title: Hello\ntags: [a, b]')
    expect(result.body).toBe('# Body\n')
  })

  it('accepts `...` as the closing fence and CRLF line endings', () => {
    const result = splitFrontmatter('---\r\ntitle: Hi\r\n...\r\nbody')

    expect(result.frontmatter?.data).toEqual({ title: 'Hi' })
    expect(result.body).toBe('body')
  })

  it('handles an empty block', () => {
    const result = splitFrontmatter('---\n---\nbody')

    expect(result.frontmatter).toEqual({ raw: '', data: null })
    expect(result.body).toBe('body')
  })

  it('keeps the raw source when the YAML is invalid', () => {
    const result = splitFrontmatter('---\ntitle: [unclosed\n---\nbody')

    expect(result.frontmatter).toEqual({ raw: 'title: [unclosed', data: null })
    expect(result.body).toBe('body')
  })

  it.each([
    ['no opening fence', '# Title\n---\na: 1\n---\n'],
    ['a fence that is not on the first line', '\n---\na: 1\n---\n'],
    ['an unclosed block', '---\na: 1\n# Title\n'],
  ])('leaves the content untouched with %s', (_, content) => {
    expect(splitFrontmatter(content)).toEqual({ frontmatter: null, body: content })
  })
})
