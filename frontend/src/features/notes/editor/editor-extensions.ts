import type { Extension } from '@codemirror/state'

import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'
import { basicSetup } from 'codemirror'

import { editorTheme, markdownHighlightStyle } from './editor-theme'

type CreateEditorExtensionsOptions = {
  onChange: (value: string) => void
  onSave: () => void
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
}: CreateEditorExtensionsOptions): Extension[] {
  return [
    vim({ status: true }),
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
