import type { Components } from 'react-markdown'

import { Children, isValidElement, type ReactNode } from 'react'

import { CodeBlock } from './code-block'
import { MermaidDiagram } from './mermaid-diagram'

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return Children.toArray(node).map(extractText).join('')
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children)
  }
  return ''
}

function firstCodeElement(children: ReactNode): { className: string; children: ReactNode } | null {
  const [child] = Children.toArray(children)
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return null
  }
  return { className: child.props.className ?? '', children: child.props.children }
}

function getMermaidChart(children: ReactNode): string | null {
  const code = firstCodeElement(children)
  if (code === null || !code.className.includes('language-mermaid')) {
    return null
  }
  const chart = extractText(code.children).trim()
  return chart === '' ? null : chart
}

function getCodeLanguage(children: ReactNode): string | null {
  const code = firstCodeElement(children)
  if (code === null) {
    return null
  }
  const match = /language-([\w-]+)/.exec(code.className)
  return match?.[1] ?? null
}

/**
 * Overrides for react-markdown.
 *
 * Only `pre` needs custom logic: a ```mermaid fenced block is replaced by a
 * rendered diagram, and every other fenced block gets a language header that
 * copies the code on click. Everything else is styled through
 * `.markdown-preview` CSS so the markup stays semantic.
 */
export const markdownComponents: Components = {
  pre({ children }) {
    const chart = getMermaidChart(children)
    if (chart !== null) {
      return <MermaidDiagram chart={chart} />
    }
    const code = firstCodeElement(children)
    return (
      <CodeBlock
        code={code === null ? '' : extractText(code.children)}
        language={getCodeLanguage(children)}
      >
        {children}
      </CodeBlock>
    )
  },
}
