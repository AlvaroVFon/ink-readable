import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copies text to the clipboard and reports `copied` for `resetMs` afterwards,
 * long enough to show a confirmation.
 */
export function useCopyToClipboard(resetMs = 1500): {
  copied: boolean
  copy: (text: string) => Promise<void>
} {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const copy = useCallback(
    async (text: string) => {
      if (navigator.clipboard === undefined) {
        return
      }
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = window.setTimeout(() => {
          setCopied(false)
        }, resetMs)
      } catch {
        // The clipboard can reject (permissions, insecure context); the source
        // stays readable, so there is nothing to recover from.
      }
    },
    [resetMs],
  )

  return { copied, copy }
}
