import type { Components } from 'react-markdown'

import { Children, isValidElement, type ReactNode } from 'react'

import { MermaidDiagram } from './mermaid-diagram'

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return Children.toArray(node).map(extractText).join('')
  }
  return ''
}

function getMermaidChart(children: ReactNode): string | null {
  const [child] = Children.toArray(children)
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return null
  }
  if (!(child.props.className ?? '').includes('language-mermaid')) {
    return null
  }
  const chart = extractText(child.props.children).trim()
  return chart === '' ? null : chart
}

/**
 * Overrides for react-markdown.
 *
 * Only `pre` needs custom logic: a ```mermaid fenced block is replaced by a
 * rendered diagram instead of a code block. Everything else is styled through
 * `.markdown-preview` CSS so the markup stays semantic.
 */
export const markdownComponents: Components = {
  pre({ children }) {
    const chart = getMermaidChart(children)
    if (chart !== null) {
      return <MermaidDiagram chart={chart} />
    }
    return <pre>{children}</pre>
  },
}
