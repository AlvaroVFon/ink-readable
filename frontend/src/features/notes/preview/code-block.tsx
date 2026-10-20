import type { ReactNode } from 'react'

import { Check, Copy } from 'lucide-react'

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

type CodeBlockProps = {
  /** Language from the fence info string (`go`, `typescript`, ...). */
  language: string | null
  /** Plain text of the block, used for the clipboard. */
  code: string
  children: ReactNode
}

/**
 * Fenced code block with a language header.
 *
 * The header is a button: clicking it copies the block's source to the
 * clipboard and briefly confirms with a check mark. Blocks without a language
 * render as a plain `pre`.
 */
export function CodeBlock({ language, code, children }: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard()

  if (language === null) {
    return <pre>{children}</pre>
  }

  return (
    <div className='code-block'>
      <button
        aria-label={`Copy ${language} code`}
        className={cn('code-block-language', copied && 'code-block-language-copied')}
        onClick={() => {
          void copy(code)
        }}
        type='button'
      >
        <span>{copied ? 'Copied!' : language}</span>
        {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
      </button>
      <pre>{children}</pre>
    </div>
  )
}
