import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

/**
 * Chrome for the markdown editor.
 *
 * Every color is a CSS variable from the app theme, so the editor follows the
 * `.dark` class automatically without reconfiguring CodeMirror when the theme
 * changes.
 */
export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '0.95rem',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.7',
    overflowY: 'auto',
  },
  '.cm-content': {
    padding: '1.5rem 0',
    caretColor: 'var(--foreground)',
  },
  '.cm-line': { padding: '0 1.5rem' },
  '.cm-gutters': {
    backgroundColor: 'var(--background)',
    color: 'var(--muted-foreground)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in oklab, var(--muted) 45%, transparent)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  // Drawn selection (editor not focused) and the native selection while the
  // content is focused. `drawSelection` pins the focused selection to the
  // browser's `Highlight` color, which is light in dark mode and washes out the
  // text, so override it with a theme-tinted, readable color.
  '&.cm-editor .cm-selectionLayer .cm-selectionBackground, &.cm-editor.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
    {
      backgroundColor: 'color-mix(in oklab, var(--primary) 30%, var(--background))',
    },
  '& .cm-content.cm-content :focus ::selection, & .cm-content.cm-content :focus::selection': {
    backgroundColor: 'color-mix(in oklab, var(--primary) 30%, var(--background)) !important',
    color: 'var(--foreground)',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
  '.cm-selectionMatch': {
    backgroundColor: 'color-mix(in oklab, var(--primary) 14%, transparent)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in oklab, var(--primary) 22%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in oklab, var(--primary) 35%, transparent)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
  },
  '.cm-vim-panel': {
    backgroundColor: 'var(--muted)',
    color: 'var(--muted-foreground)',
    padding: '2px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    borderTop: '1px solid var(--border)',
  },
})

/**
 * Markdown syntax colors. Tokens resolve through the shared `--syntax-*`
 * palette so highlighted markdown and highlighted code blocks stay consistent
 * in both themes.
 */
export const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: 'var(--syntax-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--syntax-number)' },
  {
    tag: [tags.heading1, tags.heading2, tags.heading3, tags.heading4, tags.heading5, tags.heading6],
    color: 'var(--syntax-heading)',
    fontWeight: '700',
  },
  { tag: [tags.link, tags.url], color: 'var(--syntax-link)', textDecoration: 'underline' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.monospace, color: 'var(--syntax-code)' },
  { tag: tags.quote, color: 'var(--syntax-quote)', fontStyle: 'italic' },
  { tag: tags.list, color: 'var(--syntax-list)' },
  {
    tag: [tags.contentSeparator, tags.meta, tags.processingInstruction],
    color: 'var(--syntax-comment)',
  },
])
