import * as React from 'react'

/**
 * Subscribes to a CSS media query with `useSyncExternalStore`, so the first
 * render and later resizes stay in step without an effect that sets state.
 */
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query])

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
