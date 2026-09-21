import { useEffect, useRef, type RefObject } from 'react'

import { computeScrollRatio, ratioToScrollTop } from '../lib/scroll-sync'

/**
 * Keeps the editor and preview panes scrolled to the same relative position.
 *
 * A ref guards against feedback loops: while one pane is driven
 * programmatically, its own scroll event is ignored for the rest of the frame.
 */
export function useScrollSync(
  editorScroller: HTMLElement | null,
  previewRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  const syncing = useRef(false)

  useEffect(() => {
    const preview = previewRef.current
    if (!enabled || editorScroller === null || preview === null) {
      return () => {}
    }

    const sync = (source: HTMLElement, target: HTMLElement) => {
      if (syncing.current) {
        return
      }
      syncing.current = true
      target.scrollTop = ratioToScrollTop(target, computeScrollRatio(source))
      window.requestAnimationFrame(() => {
        syncing.current = false
      })
    }

    const handleEditorScroll = () => {
      sync(editorScroller, preview)
    }
    const handlePreviewScroll = () => {
      sync(preview, editorScroller)
    }

    editorScroller.addEventListener('scroll', handleEditorScroll, { passive: true })
    preview.addEventListener('scroll', handlePreviewScroll, { passive: true })

    return () => {
      editorScroller.removeEventListener('scroll', handleEditorScroll)
      preview.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [editorScroller, previewRef, enabled])
}
