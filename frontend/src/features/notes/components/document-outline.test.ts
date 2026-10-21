import { describe, expect, it } from 'vitest'

import { collectOutline } from '../lib/outline'

function preview(markup: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = `<div class="markdown-preview">${markup}</div>`
  return root
}

describe('collectOutline', () => {
  it('returns the rendered headings with their ids and levels', () => {
    const root = preview(`
      <h1 id="ink">Ink</h1>
      <p>body</p>
      <h2 id="why">Why</h2>
      <h3 id="details">Details</h3>
      <h4 id="ignored">Ignored</h4>
    `)

    expect(collectOutline(root)).toEqual([
      { id: 'ink', text: 'Ink', level: 1 },
      { id: 'why', text: 'Why', level: 2 },
      { id: 'details', text: 'Details', level: 3 },
    ])
  })

  it('skips headings without an id', () => {
    const root = preview('<h2>No anchor</h2><h2 id="anchor">Anchor</h2>')

    expect(collectOutline(root)).toEqual([{ id: 'anchor', text: 'Anchor', level: 2 }])
  })

  it('returns nothing without a root or headings', () => {
    expect(collectOutline(null)).toEqual([])
    expect(collectOutline(preview('<p>plain</p>'))).toEqual([])
  })
})
