import { describe, expect, it } from 'vitest'

import { scopeAnchors } from './scope-anchors'

describe('scopeAnchors', () => {
  it('prefixes ids and internal links consistently, once', () => {
    const root = document.createElement('div')
    root.innerHTML = '<h3 id="user">User</h3><a href="#user">go</a><a href="https://x.dev">ext</a>'

    scopeAnchors(root)
    scopeAnchors(root)

    expect(root.querySelector('h3')?.id).toBe('print-user')
    expect(root.querySelector('a')?.getAttribute('href')).toBe('#print-user')
    expect(root.querySelectorAll('a')[1]?.getAttribute('href')).toBe('https://x.dev')
  })
})
