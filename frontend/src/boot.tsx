import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { HashRouter } from 'react-router'

import App from './App'
import { EditorConfigProvider } from './components/editor-config/editor-config-context'
import { ThemeProvider } from './components/theme/theme-provider'
import { setApiBaseUrl } from './lib/http'
import { isTauri, resolveApiBaseUrl } from './lib/tauri'

type BootStatus = 'ready' | 'loading' | 'error'

/**
 * Resolves the API base URL before rendering the app.
 *
 * In the browser this is a no-op (the relative default is used and there is no
 * loading state). In the desktop shell it waits for the Go sidecar URL from the
 * `get_api_url` command, showing a minimal error screen with a retry action if
 * the backend does not come up.
 */
export function Boot() {
  const [status, setStatus] = useState<BootStatus>(() => (isTauri() ? 'loading' : 'ready'))
  const [error, setError] = useState<string>()

  const resolve = useCallback(async () => {
    try {
      setApiBaseUrl(await resolveApiBaseUrl())
      setStatus('ready')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (isTauri()) {
      resolveApiBaseUrl()
        .then((baseUrl) => {
          if (cancelled) return
          setApiBaseUrl(baseUrl)
          setStatus('ready')
        })
        .catch((cause: unknown) => {
          if (cancelled) return
          setError(cause instanceof Error ? cause.message : String(cause))
          setStatus('error')
        })
    }

    return () => {
      cancelled = true
    }
  }, [])

  const retry = useCallback(() => {
    setStatus('loading')
    setError(undefined)
    void resolve()
  }, [resolve])

  if (status === 'loading') {
    return (
      <CenteredMessage>
        <p className='text-sm'>Starting Ink &amp; Readable…</p>
      </CenteredMessage>
    )
  }

  if (status === 'error') {
    return (
      <CenteredMessage>
        <p className='text-sm text-muted-foreground'>
          The backend did not start{error ? `: ${error}` : '.'}
        </p>
        <button
          type='button'
          onClick={retry}
          className='rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent'
        >
          Retry
        </button>
      </CenteredMessage>
    )
  }

  return (
    <ThemeProvider>
      <EditorConfigProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </EditorConfigProvider>
    </ThemeProvider>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className='flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground'>
      {children}
    </div>
  )
}
