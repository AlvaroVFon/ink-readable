import { describe, expect, it } from 'vitest'

import { computeScrollRatio, ratioToScrollTop } from './scroll-sync'

function createScroller(scrollHeight: number, clientHeight: number): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true })
  return element
}

describe('computeScrollRatio', () => {
  it('returns the traveled fraction of the scrollable range', () => {
    const element = createScroller(1000, 200)
    element.scrollTop = 400

    expect(computeScrollRatio(element)).toBeCloseTo(0.5)
  })

  it('returns 0 when there is nothing to scroll', () => {
    const element = createScroller(200, 200)

    expect(computeScrollRatio(element)).toBe(0)
  })
})

describe('ratioToScrollTop', () => {
  it('maps a ratio onto the target scroll range', () => {
    const element = createScroller(1000, 200)

    expect(ratioToScrollTop(element, 0.25)).toBe(200)
  })

  it('clamps to the valid scroll range', () => {
    const element = createScroller(1000, 200)

    expect(ratioToScrollTop(element, 2)).toBe(800)
    expect(ratioToScrollTop(element, -1)).toBe(0)
  })

  it('returns 0 when the target cannot scroll', () => {
    const element = createScroller(100, 100)

    expect(ratioToScrollTop(element, 0.5)).toBe(0)
  })
})
