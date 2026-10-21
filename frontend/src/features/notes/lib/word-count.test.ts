import { describe, expect, it } from 'vitest'

import { countWords } from './word-count'

describe('countWords', () => {
  it('counts words, numbers and contractions', () => {
    expect(countWords("A calm, keyboard-first home for 2 writers. Don't rush.")).toBe(9)
  })

  it('ignores frontmatter and extra whitespace', () => {
    expect(countWords('---\ntitle: Home\ntags: [a, b]\n---\n\n# Hello world\n')).toBe(2)
  })

  it('returns zero for empty content', () => {
    expect(countWords('   \n\n')).toBe(0)
  })
})
