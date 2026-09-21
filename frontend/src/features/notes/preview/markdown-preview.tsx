import { memo, useDeferredValue } from 'react'
import ReactMarkdown, { type Options } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

import { markdownComponents } from './markdown-components'
import { markdownSanitizeSchema } from './sanitize-schema'

const remarkPlugins: NonNullable<Options['remarkPlugins']> = [remarkGfm, remarkMath]
const rehypePlugins: NonNullable<Options['rehypePlugins']> = [
  rehypeKatex,
  rehypeHighlight,
  [rehypeSanitize, markdownSanitizeSchema],
]

type MarkdownPreviewProps = {
  content: string
}

const MarkdownPreviewContent = memo(function MarkdownPreviewContent({
  content,
}: MarkdownPreviewProps) {
  return (
    <div className='markdown-preview'>
      <ReactMarkdown
        components={markdownComponents}
        rehypePlugins={rehypePlugins}
        remarkPlugins={remarkPlugins}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})

/**
 * Live markdown preview.
 *
 * `useDeferredValue` lets React keep the editor responsive while a large
 * document re-renders, and the memoized body skips work when only the parent
 * re-renders (for example when switching view mode).
 */
export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const deferredContent = useDeferredValue(content)
  return <MarkdownPreviewContent content={deferredContent} />
}
