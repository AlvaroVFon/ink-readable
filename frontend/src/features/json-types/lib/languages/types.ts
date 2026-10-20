import type { Extension } from '@codemirror/state'

import type { Schema } from '../ir'

export type OptionValue = string | boolean

export type LanguageOptions = Record<string, OptionValue>

/** A setting a language exposes; the page renders a control for each one. */
export type LanguageOption =
  | { kind: 'boolean'; key: string; label: string; default: boolean }
  | {
      kind: 'select'
      key: string
      label: string
      default: string
      choices: { value: string; label: string }[]
    }

/**
 * A language the generator can emit. Adding a language means implementing this
 * interface in its own file and listing it in `./index.ts`.
 */
export type TargetLanguage = {
  id: string
  label: string
  options: LanguageOption[]
  /** Lazily loads CodeMirror highlighting for the generated code. */
  loadHighlighting: () => Promise<Extension>
  /** `options` always has a value for every declared option. */
  emit: (schema: Schema, options: LanguageOptions) => string
}
