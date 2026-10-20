import { describe, expect, it, vi } from 'vitest'

import { paginatePrint } from './paginate-print'

const PAGE = 24 * (96 / 2.54)

/** Stacks `heights` vertically so measurement sees a real layout. */
function stack(elements: Element[], heights: number[]) {
  let top = 0
  elements.forEach((element, index) => {
    const height = heights[index] ?? 0
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 0, height))
    top += height
  })
}

function buildRoot(tags: string[], heights: number[]): HTMLElement {
  const root = document.createElement('div')
  root.className = 'print-root'
  const preview = document.createElement('div')
  preview.className = 'markdown-preview'
  preview.innerHTML = tags.join('')
  root.append(preview)
  document.body.append(root)
  stack([...preview.children], heights)
  return root
}

describe('paginatePrint', () => {
  it('fills pages in order and numbers each footer', () => {
    const root = buildRoot(
      ['<p>a</p>', '<p>b</p>', '<p>c</p>'],
      [PAGE * 0.6, PAGE * 0.6, PAGE * 0.3],
    )

    paginatePrint(root)

    const footers = [...root.querySelectorAll('.print-page-footer')].map((node) => node.textContent)
    expect(footers).toEqual(['1 / 2', '2 / 2'])
    expect(root.classList.contains('is-paged')).toBe(true)
    expect(root.querySelector('.markdown-preview')?.classList.contains('print-source')).toBe(true)
    root.remove()
  })

  it('moves a heading to the next page together with its first block', () => {
    const root = buildRoot(
      ['<p>a</p>', '<h3>Title</h3>', '<p>b</p>'],
      [PAGE * 0.9, PAGE * 0.05, PAGE * 0.2],
    )

    paginatePrint(root)

    const pages = [...root.querySelectorAll('.print-page')]
    expect(pages).toHaveLength(2)
    expect(pages[1]?.querySelector('h3')?.textContent).toBe('Title')
    root.remove()
  })

  it('puts the contents on its own page and writes the page of each linked heading', () => {
    const root = buildRoot(
      [
        '<h1 id="t">T</h1>',
        '<h2 id="contents">Contents</h2>',
        '<ul><li><a href="#types">Types</a></li></ul>',
        '<h2 id="conventions">Conventions</h2>',
        '<h2 id="types">Types</h2>',
      ],
      [PAGE * 0.1, PAGE * 0.1, PAGE * 0.1, PAGE * 0.1, PAGE * 0.1],
    )

    paginatePrint(root)

    const link = root.querySelector('.print-pages a')
    expect(link?.querySelector('.toc-page')?.textContent).toBe('2')
    expect(link?.getAttribute('href')).toBe('#print-types')
    expect(root.querySelector('.print-pages #print-types')).not.toBeNull()
    root.remove()
  })

  it('gives a block taller than a page as many pages as it needs', () => {
    const root = buildRoot(['<table></table>', '<p>after</p>'], [PAGE * 2.5, PAGE * 0.1])

    paginatePrint(root)

    const footers = [...root.querySelectorAll('.print-page-footer')].map((node) => node.textContent)
    expect(footers).toEqual(['1 / 4', '2 / 4', '3 / 4', '4 / 4'])
    root.remove()
  })
})
