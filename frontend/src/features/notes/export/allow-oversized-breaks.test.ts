import { describe, expect, it, vi } from 'vitest'

import { allowOversizedBreaks } from './allow-oversized-breaks'

function sized(tag: string, height: number): HTMLElement {
  const element = document.createElement(tag)
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, height))
  return element
}

describe('allowOversizedBreaks', () => {
  it('lets only blocks taller than a page split', () => {
    const root = document.createElement('div')
    const table = sized('table', 300)
    const pre = sized('pre', 5000)
    root.append(table, pre)

    allowOversizedBreaks(root)

    expect(table.classList.contains('allow-break')).toBe(false)
    expect(pre.classList.contains('allow-break')).toBe(true)
    expect(root.classList.contains('is-measuring')).toBe(false)
  })
})
