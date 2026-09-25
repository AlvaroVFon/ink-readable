import { describe, expect, it } from 'vitest'

import { resolveLeaderKey } from './leader-keys'

describe('resolveLeaderKey', () => {
  it('starts the leader on space', () => {
    expect(resolveLeaderKey(false, ' ')).toEqual({ leader: true, action: null })
  })

  it('toggles the sidebar on space then e', () => {
    expect(resolveLeaderKey(true, 'e')).toEqual({ leader: false, action: 'toggleSidebar' })
  })

  it('opens the finder on two spaces', () => {
    expect(resolveLeaderKey(true, ' ')).toEqual({ leader: false, action: 'openFinder' })
  })

  it('clears the leader on an unknown key', () => {
    expect(resolveLeaderKey(true, 'z')).toEqual({ leader: false, action: null })
  })

  it('ignores regular keys', () => {
    expect(resolveLeaderKey(false, 'j')).toEqual({ leader: false, action: null })
  })
})
