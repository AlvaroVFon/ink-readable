import type { Compartment, Extension } from '@codemirror/state'

import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'
import { basicSetup } from 'codemirror'

import { editorTheme, markdownHighlightStyle } from './editor-theme'
import { relativeLineNumbersExtension } from './relative-line-numbers'

type CreateEditorExtensionsOptions = {
  onChange: (value: string) => void
  onSave: () => void
  vimCompartment: Compartment
  vimEnabled: boolean
  lineNumbersCompartment: Compartment
  relativeLineNumbers: boolean
}

/**
 * Vim bindings, toggled through a `Compartment` so the editor can switch them
 * on and off at runtime without being recreated.
 */
export function vimExtension(enabled: boolean): Extension {
  return enabled ? vim({ status: true }) : []
}

/**
 * Line numbers, toggled through a `Compartment` so switching between absolute
 * (`basicSetup`'s default gutter) and relative numbers does not recreate the
 * editor.
 */
export function lineNumbersExtension(relative: boolean): Extension {
  return relative ? relativeLineNumbersExtension() : []
}

/**
 * Extension list for the markdown editor.
 *
 * Order matters: `vim()` must come before `basicSetup`, otherwise the default
 * keymaps win the first match and swallow the vim bindings. For the same reason
 * this editor creates the `EditorView` by hand instead of using a wrapper such
 * as `@uiw/react-codemirror`, which appends user extensions after `basicSetup`.
 */
export function createEditorExtensions({
  onChange,
  onSave,
  vimCompartment,
  vimEnabled,
  lineNumbersCompartment,
  relativeLineNumbers,
}: CreateEditorExtensionsOptions): Extension[] {
  return [
    vimCompartment.of(vimExtension(vimEnabled)),
    lineNumbersCompartment.of(lineNumbersExtension(relativeLineNumbers)),
    basicSetup,
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(markdownHighlightStyle),
    EditorView.lineWrapping,
    editorTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString())
      }
    }),
    EditorView.domEventHandlers({
      keydown: (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          onSave()
          return true
        }
        return false
      },
    }),
  ]
}
