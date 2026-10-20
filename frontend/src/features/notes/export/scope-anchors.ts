const PREFIX = 'print-'

/**
 * Makes the anchors of the print copy unique. The on-screen preview (hidden
 * while printing) renders the same headings, so without this `#user` can
 * resolve to the hidden element and the link has no target in the PDF.
 */
export function scopeAnchors(root: HTMLElement): void {
  for (const element of root.querySelectorAll('[id]')) {
    if (!element.id.startsWith(PREFIX)) {
      element.id = `${PREFIX}${element.id}`
    }
  }
  for (const link of root.querySelectorAll('a[href^="#"]')) {
    const href = link.getAttribute('href') ?? ''
    if (href.length > 1 && !href.startsWith(`#${PREFIX}`)) {
      link.setAttribute('href', `#${PREFIX}${href.slice(1)}`)
    }
  }
}
