import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import { createEditorExtensions, lineNumbersExtension, vimExtension } from './editor-extensions'
import { registerVimCommands, setVimSaveHandler } from './vim'

type UseCodeMirrorOptions = {
  initialDoc: string
  onChange: (value: string) => void
  onSave: () => void
  vimEnabled: boolean
  relativeLineNumbers: boolean
}

type UseCodeMirrorResult = {
  containerRef: RefObject<HTMLDivElement | null>
  /** The element that actually scrolls, used to sync with the preview pane. */
  scrollElement: HTMLElement | null
  /** Re-measures the viewport, needed after the editor is shown again. */
  requestMeasure: () => void
  /** Current document contents, read straight from the editor state. */
  getContent: () => string
  /** Replaces the whole document, used after formatting on save. */
  replaceContent: (value: string) => void
}

/**
 * Mounts a CodeMirror 6 `EditorView` into a ref'd container.
 *
 * The view is created once on mount: the parent remounts the editor per
 * document (via `key`), so there is no need to push external document changes
 * into the view. Callbacks are read from refs to avoid recreating the view.
 *
 * Vim bindings live in a `Compartment` and are reconfigured when `vimEnabled`
 * changes, so toggling the preference does not destroy the editor state.
 */
export function useCodeMirror({
  initialDoc,
  onChange,
  onSave,
  vimEnabled,
  relativeLineNumbers,
}: UseCodeMirrorOptions): UseCodeMirrorResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  const initialDocRef = useRef(initialDoc)
  const vimCompartmentRef = useRef(new Compartment())
  const lineNumbersCompartmentRef = useRef(new Compartment())
  const initialVimEnabledRef = useRef(vimEnabled)
  const initialRelativeLineNumbersRef = useRef(relativeLineNumbers)
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    onChangeRef.current = onChange
    onSaveRef.current = onSave
  })

  useEffect(() => {
    const parent = containerRef.current
    if (parent === null) {
      return () => {}
    }

    registerVimCommands()
    setVimSaveHandler(() => {
      onSaveRef.current()
    })

    const view = new EditorView({
      doc: initialDocRef.current,
      parent,
      extensions: createEditorExtensions({
        onChange: (value) => {
          onChangeRef.current(value)
        },
        onSave: () => {
          onSaveRef.current()
        },
        vimCompartment: vimCompartmentRef.current,
        vimEnabled: initialVimEnabledRef.current,
        lineNumbersCompartment: lineNumbersCompartmentRef.current,
        relativeLineNumbers: initialRelativeLineNumbersRef.current,
      }),
    })
    viewRef.current = view

    // oxlint-disable-next-line react/set-state-in-effect -- exposing the view's scroller to the scroll-sync effect
    setScrollElement(view.scrollDOM)

    return () => {
      view.destroy()
      viewRef.current = null
      setScrollElement(null)
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (view === null) {
      return
    }
    view.dispatch({
      effects: vimCompartmentRef.current.reconfigure(vimExtension(vimEnabled)),
    })
  }, [vimEnabled])

  useEffect(() => {
    const view = viewRef.current
    if (view === null) {
      return
    }
    view.dispatch({
      effects: lineNumbersCompartmentRef.current.reconfigure(
        lineNumbersExtension(relativeLineNumbers),
      ),
    })
  }, [relativeLineNumbers])

  const requestMeasure = useCallback(() => {
    viewRef.current?.requestMeasure()
  }, [])

  const getContent = useCallback(() => viewRef.current?.state.doc.toString() ?? '', [])

  const replaceContent = useCallback((value: string) => {
    const view = viewRef.current
    if (view === null || view.state.doc.toString() === value) {
      return
    }
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [])

  return { containerRef, scrollElement, requestMeasure, getContent, replaceContent }
}
