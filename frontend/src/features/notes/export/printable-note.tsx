import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { ThemeContext, useTheme } from '@/components/theme/theme-context'

import { MarkdownPreview } from '../preview/markdown-preview'
import { allowOversizedBreaks } from './allow-oversized-breaks'
import { paginatePrint } from './paginate-print'
import { scopeAnchors } from './scope-anchors'

/** Upper bound to wait for Mermaid diagrams before printing anyway. */
const MAX_WAIT_MS = 3000
const POLL_MS = 50

function fontsReady(): Promise<unknown> {
  return 'fonts' in document ? document.fonts.ready : Promise.resolve()
}

type PrintableNoteProps = {
  /** Printed as a heading above the content; omit when the content has its own. */
  title?: string
  content: string
  /** Rendered above the content, e.g. a cover image. */
  header?: ReactNode
  /** Applied to the print root, e.g. CSS variables for the document typography. */
  style?: CSSProperties
  /**
   * Lays the document out in fixed A4 pages with a page-number footer and
   * adds the page of each heading to the table of contents (`h2 + ul` made
   * of `#` links).
   */
  paginated?: boolean
  /** Called once the note (including diagrams) is laid out. */
  onReady: () => void
}

/**
 * Off-screen copy of the note used as the print source. It is portalled to
 * `<body>` so the print stylesheet can hide the rest of the app, and it always
 * renders in light mode since it ends up on paper.
 */
export function PrintableNote({
  title,
  content,
  header,
  style,
  paginated = false,
  onReady,
}: PrintableNoteProps) {
  const theme = useTheme()
  const lightTheme = useMemo(() => ({ ...theme, resolvedTheme: 'light' as const }), [theme])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const onReadyRef = useRef(onReady)
  const paginatedRef = useRef(paginated)

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
        // Fonts must be loaded before measuring or the page numbers drift.
        void fontsReady().then(() => {
          requestAnimationFrame(() => {
            const root = rootRef.current
            if (root !== null && paginatedRef.current) {
              paginatePrint(root)
            } else if (root !== null) {
              allowOversizedBreaks(root)
              scopeAnchors(root)
            }
            onReadyRef.current()
          })
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
        style={style}
      >
        {header}
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
