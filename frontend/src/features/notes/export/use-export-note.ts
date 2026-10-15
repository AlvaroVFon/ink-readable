import { useCallback, useEffect, useRef, useState } from 'react'

import { printWindow, saveMarkdownFile } from '@/lib/tauri'

import { toExportFileName } from './export-file-name'

type UseExportNoteOptions = {
  name: string
  /** Returns the live editor text, including changes not yet autosaved. */
  getContent: () => string
}

type PrintJob = { id: number; content: string }

/**
 * Export actions for the open note.
 *
 * - Markdown: saves the raw text through the native save panel.
 * - PDF: mounts a printable copy of the note and opens the print dialog,
 *   where the user picks "Save as PDF". The copy stays mounted (hidden on
 *   screen) until the next export: the native print panel is a sheet that may
 *   read the page after `printWindow` resolves.
 */
export function useExportNote({ name, getContent }: UseExportNoteOptions) {
  const [printJob, setPrintJob] = useState<PrintJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const restoreTitleRef = useRef<(() => void) | null>(null)

  // Put the window title back once printing ends, or when the editor goes away.
  useEffect(() => {
    const restore = () => {
      restoreTitleRef.current?.()
      restoreTitleRef.current = null
    }
    window.addEventListener('afterprint', restore)
    return () => {
      window.removeEventListener('afterprint', restore)
      restore()
    }
  }, [])

  const exportMarkdown = useCallback(async () => {
    setError(null)
    try {
      await saveMarkdownFile(toExportFileName(name, 'md'), getContent())
    } catch {
      setError('Export failed')
    }
  }, [name, getContent])

  const exportPdf = useCallback(() => {
    setError(null)
    setPrintJob((previous) => ({ id: (previous?.id ?? 0) + 1, content: getContent() }))
  }, [getContent])

  // Called by `PrintableNote` once it is laid out. The window title becomes
  // the default file name in the "Save as PDF" panel.
  const print = useCallback(async () => {
    if (restoreTitleRef.current === null) {
      const previousTitle = document.title
      restoreTitleRef.current = () => {
        document.title = previousTitle
      }
    }
    document.title = toExportFileName(name, 'pdf').replace(/\.pdf$/, '')
    try {
      await printWindow()
    } catch {
      setError('Export failed')
      restoreTitleRef.current?.()
      restoreTitleRef.current = null
    }
  }, [name])

  return { exportMarkdown, exportPdf, print, printJob, error }
}
