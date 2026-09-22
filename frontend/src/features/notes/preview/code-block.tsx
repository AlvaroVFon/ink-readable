import { Check, Copy } from 'lucide-react'
import { useState, type ReactNode } from 'react'

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
  const [copied, setCopied] = useState(false)

  if (language === null) {
    return <pre>{children}</pre>
  }

  const handleCopy = async () => {
    if (navigator.clipboard === undefined) {
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      // The clipboard can reject (permissions, insecure context); the block
      // stays readable, so there is nothing to recover from.
    }
  }

  return (
    <div className='code-block'>
      <button
        aria-label={`Copy ${language} code`}
        className={cn('code-block-language', copied && 'code-block-language-copied')}
        onClick={() => {
          void handleCopy()
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
