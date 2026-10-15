import { useEffect, useRef, type RefObject } from 'react'

import { computeScrollRatio, ratioToScrollTop } from '../lib/scroll-sync'

type Pane = 'editor' | 'preview'

/** Events that mean the user is scrolling (or typing in) a pane on purpose. */
const INTENT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

/**
 * Keeps the editor and preview panes scrolled to the same relative position.
 *
 * Only the pane the user last interacted with drives the other one. Scroll
 * events also fire without user input (the preview re-rendering and changing
 * height, the browser clamping `scrollTop`, CodeMirror re-measuring), and
 * letting those drive the sync made the editor jump while typing, typically
 * back to the top while the preview was still shorter than the viewport. The
 * editor drives by default since that is where typing happens.
 */
export function useScrollSync(
  editorScroller: HTMLElement | null,
  previewRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  const driver = useRef<Pane>('editor')

  useEffect(() => {
    const preview = previewRef.current
    if (!enabled || editorScroller === null || preview === null) {
      return () => {}
    }

    const panes: Record<Pane, HTMLElement> = { editor: editorScroller, preview }
    const cleanups: (() => void)[] = []

    for (const pane of ['editor', 'preview'] as const) {
      const source = panes[pane]
      const target = panes[pane === 'editor' ? 'preview' : 'editor']

      const claim = () => {
        driver.current = pane
      }
      const handleScroll = () => {
        if (driver.current === pane) {
          target.scrollTop = ratioToScrollTop(target, computeScrollRatio(source))
        }
      }

      for (const event of INTENT_EVENTS) {
        source.addEventListener(event, claim, { passive: true, capture: true })
      }
      source.addEventListener('scroll', handleScroll, { passive: true })

      cleanups.push(() => {
        for (const event of INTENT_EVENTS) {
          source.removeEventListener(event, claim, { capture: true })
        }
        source.removeEventListener('scroll', handleScroll)
      })
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
    }
  }, [editorScroller, previewRef, enabled])
}
