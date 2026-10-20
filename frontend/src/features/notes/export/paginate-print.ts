import { scopeAnchors } from './scope-anchors'

/*
 * WebKit prints no page numbers (no `@page` margin boxes) and offers no CSS
 * way to know the page of a heading. So the document is laid out into fixed
 * A4 "page" boxes ourselves: each one holds whole blocks and its own footer,
 * and the table of contents is filled from where each heading ended up.
 */

/** Height of one printed page box. A hair under the 25.7cm of A4 minus the 2cm margins. */
const PAGE_HEIGHT_CM = 25.6
/** Room left for blocks; the rest holds the footer. */
const CONTENT_HEIGHT_CM = 24
const PX_PER_CM = 96 / 2.54
const PAGE_HEIGHT_PX = PAGE_HEIGHT_CM * PX_PER_CM
const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_CM * PX_PER_CM

const HEADING = /^H[1-6]$/

type Block = {
  element: Element
  /** Distance to the next block's top, so the gap between them travels with the block. */
  slot: number
  height: number
}

type Page = {
  blocks: Block[]
  /** Printed pages this box spans (more than one only for a block taller than a page). */
  span: number
  /** Page number of the first printed page. */
  start: number
}

function isHeading(block: Block): boolean {
  return HEADING.test(block.element.tagName)
}

function measure(elements: Element[]): Block[] {
  const rects = elements.map((element) => element.getBoundingClientRect())
  return elements.map((element, index) => {
    const rect = rects[index]
    const next = rects[index + 1]
    const height = rect?.height ?? 0
    return {
      element,
      height,
      slot: next === undefined || rect === undefined ? height : next.top - rect.top,
    }
  })
}

/** Distributes blocks over pages, keeping headings with what follows them. */
function layout(blocks: Block[], breakBefore: Element | null): Page[] {
  const pages: Page[] = []
  let current: Page | null = null
  let used = 0

  const open = (carried: Block[] = []): Page => {
    const page: Page = { blocks: carried, span: 1, start: 0 }
    pages.push(page)
    current = page
    used = carried.reduce((sum, block) => sum + block.slot, 0)
    return page
  }

  blocks.forEach((block, index) => {
    const next = blocks[index + 1]
    const oversized = block.height > CONTENT_HEIGHT_PX
    let page = current ?? open()

    if (block.element === breakBefore && page.blocks.length > 0) {
      page = open()
    }

    if (oversized) {
      // Headings right before it go along instead of being left behind.
      const carried: Block[] = []
      for (
        let last = page.blocks.at(-1);
        page.blocks.length > 1 && last !== undefined && isHeading(last);
        last = page.blocks.at(-1)
      ) {
        carried.unshift(last)
        page.blocks.pop()
      }
      if (page.blocks.some((placed) => !isHeading(placed))) {
        page = open(carried)
      }
      page.blocks.push(block)
      page.span = Math.ceil(block.height / CONTENT_HEIGHT_PX)
      current = null
      return
    }

    // A heading needs room for the block after it, or both move to the next page.
    const needed =
      isHeading(block) && next !== undefined
        ? block.slot + Math.min(next.height, CONTENT_HEIGHT_PX)
        : block.slot
    if (page.blocks.length > 0 && used + needed > CONTENT_HEIGHT_PX) {
      page = open()
    }
    page.blocks.push(block)
    used += block.slot
  })

  let number = 1
  for (const page of pages) {
    page.start = number
    number += page.span
  }
  return pages
}

function footer(text: string, offsetPages: number): HTMLElement {
  const element = document.createElement('div')
  element.className = 'print-page-footer'
  element.style.top = `${(offsetPages + 1) * PAGE_HEIGHT_PX - 0.9 * PX_PER_CM}px`
  element.textContent = text
  return element
}

/**
 * Replaces the printed copy of the document by fixed-size pages with a
 * "n / total" footer, and fills the table of contents (`h2 + ul` made of `#`
 * links) with the page of every heading it links to. Links stay real anchors.
 *
 * `root` holds the source blocks (an optional header plus a `.markdown-preview`).
 * They are measured off-screen at the printed width, cloned into the pages and
 * hidden from the print.
 */
export function paginatePrint(root: HTMLElement): void {
  const preview = root.querySelector('.markdown-preview')
  if (preview === null) {
    return
  }
  const sources = [...root.children].filter((child) => !child.classList.contains('print-pages'))
  const elements = sources.flatMap((source) =>
    source === preview ? [...preview.children] : [source],
  )

  root.classList.add('is-measuring')
  let pages: Page[]
  try {
    const list = preview.querySelector('h2 + ul')
    const hasContents = list !== null && list.querySelector('a[href^="#"]') !== null
    pages = layout(measure(elements), hasContents ? list.nextElementSibling : null)
  } finally {
    root.classList.remove('is-measuring')
  }

  const total = pages.reduce((sum, page) => sum + page.span, 0)
  const container = document.createElement('div')
  container.className = 'print-pages'
  const pageOf = new Map<string, number>()

  for (const page of pages) {
    const box = document.createElement('div')
    box.className = 'print-page'
    box.style.height = `${page.span * PAGE_HEIGHT_CM}cm`
    const body = document.createElement('div')
    body.className = 'markdown-preview'
    for (const { element } of page.blocks) {
      const copy = element.cloneNode(true)
      body.append(copy)
      if (copy instanceof Element) {
        for (const target of [copy, ...copy.querySelectorAll('[id]')]) {
          if (target.id !== '' && !pageOf.has(target.id)) {
            pageOf.set(target.id, page.start)
          }
        }
        if (page.span > 1) {
          copy.classList.add('allow-break')
        }
      }
    }
    box.append(body)
    for (let offset = 0; offset < page.span; offset += 1) {
      box.append(footer(`${page.start + offset} / ${total}`, offset))
    }
    container.append(box)
  }

  for (const link of container.querySelectorAll<HTMLAnchorElement>('h2 + ul a[href^="#"]')) {
    const id = decodeURIComponent(link.getAttribute('href')?.slice(1) ?? '')
    const page = pageOf.get(id)
    if (page === undefined) {
      continue
    }
    const leader = document.createElement('span')
    leader.className = 'toc-leader'
    const number = document.createElement('span')
    number.className = 'toc-page'
    number.textContent = String(page)
    link.append(leader, number)
  }

  scopeAnchors(container)
  for (const source of sources) {
    source.classList.add('print-source')
  }
  root.append(container)
  root.classList.add('is-paged')
}
