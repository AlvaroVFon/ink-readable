import { useCallback, useEffect, useRef, useState } from 'react'

import type { Document } from '@/lib/types'

import { getDocument } from '@/lib/api'

export type UseDocumentResult = {
  document: Document | null
  isLoading: boolean
  error: Error | null
  reload: () => void
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Unable to load the document')
}

/**
 * Loads a document by id.
 *
 * Requests are tagged so that a slow response for a previous id can never
 * overwrite the document currently being edited (switch races).
 */
export function useDocument(documentId: string | undefined): UseDocumentResult {
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(documentId !== undefined)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (documentId === undefined) {
      requestIdRef.current += 1
      // oxlint-disable-next-line react/set-state-in-effect -- clearing state when the route has no document id
      setDocument(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsLoading(true)

    getDocument(documentId)
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return
        }
        setDocument(result)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (requestIdRef.current !== requestId) {
          return
        }
        setDocument(null)
        setError(toError(cause))
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) {
          return
        }
        setIsLoading(false)
      })
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- reloadToken is an intentional manual refetch trigger
  }, [documentId, reloadToken])

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return { document, isLoading, error, reload }
}
