import { API_BASE_URL } from '@/lib/http'

/**
 * Whether the app is running inside the Tauri shell rather than a browser.
 *
 * Tauri v2 injects `__TAURI_INTERNALS__` into the webview before the app code
 * runs, so this is safe to call at bootstrap.
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Resolves the API base URL for the current environment.
 *
 * - Web (Vite dev server / browser): the relative default, which the dev proxy
 *   forwards to the backend.
 * - Desktop: the absolute URL of the Go sidecar, obtained from the Rust
 *   `get_api_url` command (see T5).
 */
export async function resolveApiBaseUrl(): Promise<string> {
  if (!isTauri()) {
    return API_BASE_URL
  }

  const { invoke } = await import('@tauri-apps/api/core')
  const apiUrl = await invoke<string>('get_api_url')

  return `${apiUrl}/api/v1`
}

/**
 * Opens the app data directory (SQLite database and `api.log`) in the OS file
 * manager. No-op outside the desktop shell.
 */
export async function openDataDir(): Promise<void> {
  if (!isTauri()) {
    return
  }

  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('open_data_dir')
}

/**
 * Saves `contents` as a Markdown file. In the desktop shell the native save
 * panel picks the destination; in the browser it falls back to a download.
 *
 * Resolves to `false` when the user cancels the save panel.
 */
export async function saveMarkdownFile(fileName: string, contents: string): Promise<boolean> {
  if (!isTauri()) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/markdown' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    return true
  }

  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<boolean>('export_markdown', { fileName, contents })
}

/**
 * Opens the print dialog for the current window. WKWebView ignores
 * `window.print()`, so the desktop shell prints through a Rust command.
 */
export async function printWindow(): Promise<void> {
  if (!isTauri()) {
    window.print()
    return
  }

  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('print_webview')
}

/** Progress callback for {@link installUpdate}: bytes downloaded so far and the total, if known. */
export type UpdateProgress = (downloaded: number, total: number | undefined) => void

/** A newer desktop release, as reported by {@link checkForUpdate}. */
export type AvailableUpdate = {
  version: string
  /** Downloads and installs the update, then relaunches the app. */
  install: (onProgress?: UpdateProgress) => Promise<void>
}

/**
 * Checks the release feed for a newer version of the desktop app. Resolves to
 * `null` when the app is up to date, and always outside the desktop shell.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isTauri()) {
    return null
  }

  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (!update) {
    return null
  }

  return {
    version: update.version,
    install: async (onProgress) => {
      const { invoke } = await import('@tauri-apps/api/core')
      let downloaded = 0
      let total: number | undefined

      await update.download((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
        }
        onProgress?.(downloaded, total)
      })

      // The backend sidecar must be stopped before the installer replaces its
      // binary (on Windows `install()` exits the app without the usual cleanup).
      await invoke('stop_backend')
      await update.install()
      await invoke('restart_app')
    },
  }
}
