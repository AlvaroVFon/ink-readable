import type { Compartment, Extension } from '@codemirror/state'

import { indentLess, indentMore } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { EditorView, keymap, type KeyBinding } from '@codemirror/view'
import { getCM, vim } from '@replit/codemirror-vim'
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

function isVimNormalMode(view: EditorView): boolean {
  const vimState = getCM(view)?.state.vim
  return vimState != null && !vimState.insertMode
}

/**
 * Tab indents (and Shift-Tab dedents) instead of moving focus out of the
 * editor. CodeMirror leaves Tab unbound on purpose, so without this the browser
 * tabs away to the next focusable element.
 *
 * Vim leaves Tab unbound in normal/visual mode; there the key is swallowed so it
 * still never escapes the editor, while insert mode gets the usual indentation.
 */
function tabKeymapExtension(): Extension {
  const tabKeymap: KeyBinding[] = [
    {
      key: 'Tab',
      run: (view) => (isVimNormalMode(view) ? true : indentMore(view)),
      shift: (view) => (isVimNormalMode(view) ? true : indentLess(view)),
    },
  ]

  return keymap.of(tabKeymap)
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
    tabKeymapExtension(),
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
