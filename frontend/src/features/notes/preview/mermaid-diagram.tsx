import { useEffect, useId, useRef, useState } from 'react'

import { useTheme } from '@/components/theme/theme-context'

type MermaidDiagramProps = {
  chart: string
}

/**
 * Renders a ```mermaid fenced block to SVG.
 *
 * Mermaid is imported dynamically so its (large) bundle only loads when a note
 * actually contains a diagram. Diagrams render outside the markdown sanitize
 * pipeline; `securityLevel: 'strict'` makes mermaid sanitize its own labels.
 */
export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reactId = useId()

  useEffect(() => {
    let cancelled = false

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        })
        const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9-]/g, '')}`
        const { svg } = await mermaid.render(id, chart)
        if (!cancelled && containerRef.current !== null) {
          containerRef.current.innerHTML = svg
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unable to render diagram')
        }
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [chart, resolvedTheme, reactId])

  if (error !== null) {
    return <pre className='mermaid-error'>{chart}</pre>
  }

  return (
    <div
      className='mermaid-diagram'
      ref={containerRef}
    />
  )
}
