/** A4 content height with the 2cm `@page` margins, in CSS pixels at 96dpi. */
const PAGE_HEIGHT_PX = (25.7 * 96) / 2.54

/** Blocks the print stylesheet keeps in one piece (`break-inside: avoid`). */
const UNBREAKABLE = 'table, pre, .code-block, .mermaid-diagram, blockquote'

/**
 * Tables and code stay whole across pages, except those taller than a page:
 * keeping those together makes WebKit clip them, so they are marked
 * `.allow-break` and may split. The root is laid out off-screen at the printed
 * width to measure them.
 */
export function allowOversizedBreaks(root: HTMLElement): void {
  root.classList.add('is-measuring')
  try {
    for (const block of root.querySelectorAll<HTMLElement>(UNBREAKABLE)) {
      if (block.getBoundingClientRect().height > PAGE_HEIGHT_PX) {
        block.classList.add('allow-break')
      }
    }
  } finally {
    root.classList.remove('is-measuring')
  }
}
