import { editorConfigSchema, type EditorConfig } from '@/lib/types'

import { apiClient, type ApiClient } from './api-client'

/**
 * Path of the singleton editor configuration.
 *
 * The backend keeps one row keyed by `default`; the frontend only reads it and
 * patches individual preferences, so there is no create/delete operation.
 */
export const EDITOR_CONFIG_PATH = '/editor/config'

/**
 * Reads the persisted editor preferences.
 */
export function fetchEditorConfig(client: ApiClient = apiClient): Promise<EditorConfig> {
  return client.get(EDITOR_CONFIG_PATH, { schema: editorConfigSchema })
}

/**
 * Persists the dark theme preference.
 */
export function updateEditorConfigDarkTheme(
  darkTheme: boolean,
  client: ApiClient = apiClient,
): Promise<void> {
  return client.patch(`${EDITOR_CONFIG_PATH}/dark-theme`, { darkTheme })
}

/**
 * Persists the vim motion preference.
 */
export function updateEditorConfigVimMotion(
  vimMotion: boolean,
  client: ApiClient = apiClient,
): Promise<void> {
  return client.patch(`${EDITOR_CONFIG_PATH}/vim-motion`, { vimMotion })
}
