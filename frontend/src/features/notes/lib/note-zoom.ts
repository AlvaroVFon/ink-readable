export const NOTE_ZOOM_STORAGE_KEY = 'ink-readable-note-zoom'
export const NOTE_ZOOM_DEFAULT = 1
export const NOTE_ZOOM_MIN = 0.5
export const NOTE_ZOOM_MAX = 2
export const NOTE_ZOOM_STEP = 0.1

/**
 * Keeps a zoom factor within the supported range and rounded to whole percents,
 * so repeated +/- steps do not accumulate floating point drift.
 */
export function clampNoteZoom(zoom: number): number {
  const clamped = Math.min(NOTE_ZOOM_MAX, Math.max(NOTE_ZOOM_MIN, zoom))
  return Math.round(clamped * 100) / 100
}

export function noteZoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}

export function getStoredNoteZoom(): number {
  try {
    const stored = window.localStorage.getItem(NOTE_ZOOM_STORAGE_KEY)
    if (stored === null) {
      return NOTE_ZOOM_DEFAULT
    }
    const parsed = Number(stored)
    return Number.isFinite(parsed) ? clampNoteZoom(parsed) : NOTE_ZOOM_DEFAULT
  } catch {
    return NOTE_ZOOM_DEFAULT
  }
}

export function storeNoteZoom(zoom: number): void {
  try {
    window.localStorage.setItem(NOTE_ZOOM_STORAGE_KEY, String(zoom))
  } catch {
    // localStorage can be unavailable (private mode); the zoom just won't persist.
  }
}
