export const PREVIEW_FIRST_STORAGE_KEY = 'ink-readable-preview-first'

/** Whether the split view shows the preview on the left and the editor on the right. */
export function getStoredPreviewFirst(): boolean {
  try {
    return window.localStorage.getItem(PREVIEW_FIRST_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function storePreviewFirst(previewFirst: boolean): void {
  try {
    window.localStorage.setItem(PREVIEW_FIRST_STORAGE_KEY, String(previewFirst))
  } catch {
    // localStorage can be unavailable (private mode); the order just won't persist.
  }
}
