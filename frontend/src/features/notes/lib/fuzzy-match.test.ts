import { describe, expect, it } from 'vitest'

import { fuzzyRank, fuzzyScore } from './fuzzy-match'

describe('fuzzyScore', () => {
  it('returns null when a character is missing', () => {
    expect(fuzzyScore('xyz', 'alpha')).toBeNull()
  })

  it('matches a subsequence', () => {
    expect(fuzzyScore('al', 'alpha')).not.toBeNull()
    expect(fuzzyScore('pha', 'alpha')).not.toBeNull()
  })

  it('requires every whitespace-separated token to match', () => {
    expect(fuzzyScore('read alpha', 'Reading/alpha.md')).not.toBeNull()
    expect(fuzzyScore('read zzz', 'Reading/alpha.md')).toBeNull()
  })

  it('scores consecutive and word-boundary matches higher', () => {
    const contiguous = fuzzyScore('note', 'note.md')
    const scattered = fuzzyScore('note', 'n-o-t-e.md')

    expect(contiguous).not.toBeNull()
    expect(scattered).not.toBeNull()
    if (contiguous === null || scattered === null) {
      return
    }
    expect(contiguous).toBeGreaterThan(scattered)
  })

  it('treats an empty query as a match', () => {
    expect(fuzzyScore('', 'anything')).toBe(0)
  })
})

describe('fuzzyRank', () => {
  const items = ['/Reading/notes/beta.md', '/Reading/alpha.md', '/Work/spec.md']

  it('drops non-matches and keeps the original order on a tie', () => {
    expect(fuzzyRank(items, 'zzz', (item) => item)).toEqual([])
    expect(fuzzyRank(items, '', (item) => item)).toEqual(items)
  })

  it('ranks the strongest match first', () => {
    const ranked = fuzzyRank(items, 'spec', (item) => item)

    expect(ranked).toEqual(['/Work/spec.md'])
  })
})
