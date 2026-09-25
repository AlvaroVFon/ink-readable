export type LeaderAction = 'toggleSidebar' | 'openFinder' | null

export type LeaderResolution = {
  /** Whether the leader prefix is still pending after this key. */
  leader: boolean
  action: LeaderAction
}

/**
 * Resolves a key against the LazyVim-style leader (`space`) prefix used by the
 * sidebar tree. The editor registers the same bindings through vim itself.
 */
export function resolveLeaderKey(leader: boolean, key: string): LeaderResolution {
  if (leader) {
    if (key === 'e') {
      return { leader: false, action: 'toggleSidebar' }
    }
    if (key === ' ') {
      return { leader: false, action: 'openFinder' }
    }
    return { leader: false, action: null }
  }
  if (key === ' ') {
    return { leader: true, action: null }
  }
  return { leader: false, action: null }
}
