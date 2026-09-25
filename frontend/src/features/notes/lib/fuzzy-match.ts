/**
 * Dependency-free fuzzy matching used by the editor-level file finder.
 *
 * A query is split on whitespace and every token must match the target as a
 * subsequence; the score rewards matches that are consecutive, start the
 * target, or start a word. Items that do not match at all yield `null`.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return 0
  }

  const haystack = target.toLowerCase()
  let score = 0
  for (const token of tokens) {
    const tokenScore = scoreToken(token, haystack)
    if (tokenScore === null) {
      return null
    }
    score += tokenScore
  }

  // Favor shorter (more specific) targets when scores are otherwise equal.
  return score - haystack.length * 0.01
}

/**
 * Ranks `items` against `query`, dropping non-matches and preserving the
 * original order as a tie-breaker.
 */
export function fuzzyRank<T>(items: T[], query: string, toTarget: (item: T) => string): T[] {
  if (query.trim() === '') {
    return items
  }

  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, toTarget(item)) }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .toSorted((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item)
}

function scoreToken(token: string, target: string): number | null {
  let targetIndex = 0
  let previousMatch = -2
  let score = 0

  for (const character of token) {
    const found = target.indexOf(character, targetIndex)
    if (found === -1) {
      return null
    }

    score += 1
    if (found === previousMatch + 1) {
      score += 2
    }
    if (found === 0 || isWordBoundary(target[found - 1])) {
      score += 2
    }

    previousMatch = found
    targetIndex = found + 1
  }

  return score
}

function isWordBoundary(character: string | undefined): boolean {
  return (
    character === undefined ||
    character === '/' ||
    character === '-' ||
    character === '_' ||
    character === ' '
  )
}
