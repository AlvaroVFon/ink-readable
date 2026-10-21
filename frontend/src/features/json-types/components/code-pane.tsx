import type { Extension } from '@codemirror/state'

import { syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useEffect, useRef } from 'react'

import { useOptionalEditorConfig } from '@/components/editor-config/editor-config-context'
import { useTheme } from '@/components/theme/theme-context'
import {
  darkThemeExtension,
  lineNumbersExtension,
  vimExtension,
} from '@/features/notes/editor/editor-extensions'
import { codeHighlightStyle, editorTheme } from '@/features/notes/editor/editor-theme'

type CodePaneProps = {
  /** Accessible name of the editor content, read once on mount. */
  label: string
  value: string
  /** Loads the language highlighting; swapped in when it changes. */
  loadLanguage: () => Promise<Extension>
  /** Omit for a read-only pane. */
  onChange?: (value: string) => void
}

/**
 * Minimal CodeMirror editor for source code. Editable panes follow the user's
 * Vim motion and relative line number preferences; unlike the notes editor there is no save handling.
 *
 * Editable panes own their document after mount (`value` only seeds it);
 * read-only panes follow `value`.
 */
export function CodePane({ label, value, loadLanguage, onChange }: CodePaneProps) {
  const { resolvedTheme } = useTheme()
  const config = useOptionalEditorConfig()?.config
  const vimMotion = config?.vimMotion ?? false
  const relativeLineNumbers = config?.relativeLineNumbers ?? false
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const languageCompartmentRef = useRef(new Compartment())
  const darkCompartmentRef = useRef(new Compartment())
  const vimCompartmentRef = useRef(new Compartment())
  const lineNumbersCompartmentRef = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  const initialRef = useRef({
    label,
    value,
    readOnly: onChange === undefined,
    dark: resolvedTheme === 'dark',
    vim: vimMotion,
    relativeLineNumbers,
  })

  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const parent = containerRef.current
    if (parent === null) {
      return () => {}
    }
    const {
      label: ariaLabel,
      value: doc,
      readOnly,
      dark,
      vim,
      relativeLineNumbers: relative,
    } = initialRef.current
    const view = new EditorView({
      doc,
      parent,
      extensions: [
        darkCompartmentRef.current.of(darkThemeExtension(dark)),
        // Before `basicSetup`, or its keymaps swallow the vim bindings.
        vimCompartmentRef.current.of(vimExtension(vim && !readOnly)),
        lineNumbersCompartmentRef.current.of(lineNumbersExtension(relative)),
        basicSetup,
        languageCompartmentRef.current.of([]),
        syntaxHighlighting(codeHighlightStyle),
        editorTheme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        }),
      ],
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadLanguage().then((extension) => {
      if (!cancelled) {
        viewRef.current?.dispatch({
          effects: languageCompartmentRef.current.reconfigure(extension),
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [loadLanguage])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: darkCompartmentRef.current.reconfigure(darkThemeExtension(resolvedTheme === 'dark')),
    })
  }, [resolvedTheme])

  const readOnly = onChange === undefined
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: lineNumbersCompartmentRef.current.reconfigure(
        lineNumbersExtension(relativeLineNumbers),
      ),
    })
  }, [relativeLineNumbers])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: vimCompartmentRef.current.reconfigure(vimExtension(vimMotion && !readOnly)),
    })
  }, [vimMotion, readOnly])

  useEffect(() => {
    const view = viewRef.current
    if (!readOnly || view === null || view.state.doc.toString() === value) {
      return
    }
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [readOnly, value])

  return (
    <div
      ref={containerRef}
      className='min-h-0 flex-1 overflow-hidden'
    />
  )
}
