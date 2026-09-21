/**
 * Maps the scroll position of one pane onto another proportionally.
 *
 * It compares the traveled fraction of the scrollable range instead of the raw
 * pixel offset, so two panes with different heights stay roughly aligned.
 */
export function computeScrollRatio(element: HTMLElement): number {
  const max = element.scrollHeight - element.clientHeight
  if (max <= 0) {
    return 0
  }
  return element.scrollTop / max
}

export function ratioToScrollTop(element: HTMLElement, ratio: number): number {
  const max = element.scrollHeight - element.clientHeight
  if (max <= 0) {
    return 0
  }
  return Math.max(0, Math.min(max, ratio * max))
}
