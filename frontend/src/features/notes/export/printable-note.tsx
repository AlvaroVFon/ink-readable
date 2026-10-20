import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

import { ThemeContext, useTheme } from '@/components/theme/theme-context'

import { MarkdownPreview } from '../preview/markdown-preview'

/** Upper bound to wait for Mermaid diagrams before printing anyway. */
const MAX_WAIT_MS = 3000
const POLL_MS = 50

type PrintableNoteProps = {
  /** Printed as a heading above the content; omit when the content has its own. */
  title?: string
  content: string
  /** Called once the note (including diagrams) is laid out. */
  onReady: () => void
}

/**
 * Off-screen copy of the note used as the print source. It is portalled to
 * `<body>` so the print stylesheet can hide the rest of the app, and it always
 * renders in light mode since it ends up on paper.
 */
export function PrintableNote({ title, content, onReady }: PrintableNoteProps) {
  const theme = useTheme()
  const lightTheme = useMemo(() => ({ ...theme, resolvedTheme: 'light' as const }), [theme])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const started = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined

    // Mermaid fills its container asynchronously; wait until no diagram is
    // still empty (or give up after MAX_WAIT_MS).
    const check = () => {
      const pending = rootRef.current?.querySelector('.mermaid-diagram:empty') ?? null
      if (pending === null || Date.now() - started > MAX_WAIT_MS) {
        requestAnimationFrame(() => {
          onReadyRef.current()
        })
        return
      }
      timer = setTimeout(check, POLL_MS)
    }

    const frame = requestAnimationFrame(check)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [])

  return createPortal(
    <ThemeContext.Provider value={lightTheme}>
      <div
        aria-hidden='true'
        className='print-root'
        ref={rootRef}
      >
        {title !== undefined && (
          <div className='markdown-preview'>
            <h1>{title}</h1>
          </div>
        )}
        <MarkdownPreview content={content} />
      </div>
    </ThemeContext.Provider>,
    document.body,
  )
}
