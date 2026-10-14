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
