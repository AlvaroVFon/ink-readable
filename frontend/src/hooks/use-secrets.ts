import { useCallback, useEffect, useState } from 'react'

import type { Secrets } from '@/lib/types'

import { fetchSecrets } from '@/lib/api/config'

export type UseSecretsResult = {
  secrets: Secrets | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

let secretsRequest: Promise<Secrets> | null = null

function loadSecrets(): Promise<Secrets> {
  secretsRequest ??= fetchSecrets()
  return secretsRequest
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Unable to load secrets')
}

/**
 * React binding for {@link fetchSecrets}.
 *
 * The in-flight request is cached at module level, so every component that
 * mounts `useSecrets` shares the same request instead of refetching `/config`.
 * Call `refetch` to invalidate that cache and load again.
 */
export function useSecrets(): UseSecretsResult {
  const [secrets, setSecrets] = useState<Secrets | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(() => {
    setIsLoading(true)
    void loadSecrets()
      .then((value) => {
        setSecrets(value)
        setError(null)
      })
      .catch((cause: unknown) => {
        setError(toError(cause))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    refresh()
  }, [refresh])

  const refetch = useCallback(() => {
    secretsRequest = null
    refresh()
  }, [refresh])

  return { secrets, isLoading, error, refetch }
}
