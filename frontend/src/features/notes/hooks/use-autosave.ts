import { useCallback, useEffect, useRef, useState } from 'react'

import { updateDocumentContent } from '@/lib/api'

export type SaveStatus = 'dirty' | 'saving' | 'saved' | 'error'

export const AUTOSAVE_DELAY_MS = 700

type UseAutosaveOptions = {
  documentId: string
  content: string
  delayMs?: number
}

export type UseAutosaveResult = {
  status: SaveStatus
  isDirty: boolean
  saveNow: (content?: string) => Promise<void>
}

/**
 * Debounced autosave for the markdown body.
 *
 * The last persisted content is compared against the live content to skip
 * redundant writes. Pending edits are flushed on unmount (which happens when
 * the user switches document, since the editor is keyed by id).
 */
export function useAutosave({
  documentId,
  content,
  delayMs = AUTOSAVE_DELAY_MS,
}: UseAutosaveOptions): UseAutosaveResult {
  const [savedContent, setSavedContent] = useState(content)
  const [status, setStatus] = useState<SaveStatus>('saved')
  const contentRef = useRef(content)
  const savedContentRef = useRef(content)
  const documentIdRef = useRef(documentId)

  useEffect(() => {
    contentRef.current = content
    documentIdRef.current = documentId
  })

  const saveNow = useCallback(async (contentOverride?: string) => {
    const value = contentOverride ?? contentRef.current
    if (value === savedContentRef.current) {
      return
    }

    setStatus('saving')
    try {
      await updateDocumentContent(documentIdRef.current, value)
      savedContentRef.current = value
      setSavedContent(value)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (content === savedContentRef.current) {
      return () => {}
    }

    // oxlint-disable-next-line react/set-state-in-effect -- reflecting local edits in the save indicator
    setStatus('dirty')
    const timer = window.setTimeout(() => {
      void saveNow()
    }, delayMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [content, delayMs, saveNow])

  const saveNowRef = useRef(saveNow)

  useEffect(() => {
    saveNowRef.current = saveNow
  })

  useEffect(() => {
    return () => {
      void saveNowRef.current()
    }
  }, [])

  return { status, isDirty: content !== savedContent, saveNow }
}
