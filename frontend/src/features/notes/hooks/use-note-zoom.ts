import { useCallback, useEffect, useState } from 'react'

import {
  clampNoteZoom,
  getStoredNoteZoom,
  NOTE_ZOOM_DEFAULT,
  NOTE_ZOOM_STEP,
  storeNoteZoom,
} from '../lib/note-zoom'

type UseNoteZoomResult = {
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

/**
 * Zoom for the note content (editor and preview), persisted in localStorage.
 *
 * The level only scales the note panes; the app chrome stays at its normal size
 * so the toolbar and sidebar do not grow on large external displays.
 *
 * Supports the usual shortcuts while a note is open: `Cmd/Ctrl +` (or `=`) to
 * zoom in, `Cmd/Ctrl -` to zoom out and `Cmd/Ctrl 0` to reset.
 */
export function useNoteZoom(): UseNoteZoomResult {
  const [zoom, setZoom] = useState(getStoredNoteZoom)

  useEffect(() => {
    storeNoteZoom(zoom)
  }, [zoom])

  const zoomIn = useCallback(() => {
    setZoom((current) => clampNoteZoom(current + NOTE_ZOOM_STEP))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((current) => clampNoteZoom(current - NOTE_ZOOM_STEP))
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(NOTE_ZOOM_DEFAULT)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || !(event.metaKey || event.ctrlKey)) {
        return
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomIn()
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        zoomOut()
      } else if (event.key === '0') {
        event.preventDefault()
        resetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [zoomIn, zoomOut, resetZoom])

  return { zoom, zoomIn, zoomOut, resetZoom }
}
