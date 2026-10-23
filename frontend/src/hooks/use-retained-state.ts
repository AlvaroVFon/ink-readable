import type { Dispatch, SetStateAction } from 'react'

import { useCallback, useEffect, useState } from 'react'

/** Values kept for the lifetime of the app, keyed by the caller's `key`. */
const retained = new Map<string, unknown>()

/**
 * `useState` whose value survives the component unmounting (switching between
 * notes, planner and tools, or between tools), so work in progress is still
 * there on return. Not persisted across app restarts.
 */
export function useRetainedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (retained.has(key)) {
      // Callers pair each key with a single value type.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      return retained.get(key) as T
    }
    return initial
  })

  useEffect(() => {
    retained.set(key, value)
  }, [key, value])

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue(next)
  }, [])

  return [value, set]
}
