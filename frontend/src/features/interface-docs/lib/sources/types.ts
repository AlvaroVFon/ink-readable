import type { Extension } from '@codemirror/state'

import type { Contract } from '../model'

/**
 * A language contracts can be written in. Adding one means implementing this
 * type in its own file and listing it in `./index.ts`.
 */
export type SourceLanguage = {
  id: string
  label: string
  /** Example declarations the page starts with. */
  sample: string
  /** Lazily loads CodeMirror highlighting for the source. */
  loadHighlighting: () => Promise<Extension>
  /** Throws `ParseError` on input it cannot read. */
  parse: (source: string) => Contract
}
