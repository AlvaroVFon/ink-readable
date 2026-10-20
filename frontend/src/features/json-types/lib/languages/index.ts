import type { LanguageOptions, TargetLanguage } from './types'

import { go } from './go'
import { typescript } from './typescript'

export type { LanguageOption, LanguageOptions, OptionValue, TargetLanguage } from './types'

/** Every language the generator offers, in picker order. */
export const languages: TargetLanguage[] = [typescript, go]

export function getLanguage(id: string): TargetLanguage {
  return languages.find((language) => language.id === id) ?? languages[0]
}

/**
 * Fills in defaults for the language's options, ignoring stored values that
 * no longer match the option's type.
 */
export function resolveOptions(
  language: TargetLanguage,
  stored: LanguageOptions | undefined,
): LanguageOptions {
  const resolved: LanguageOptions = {}
  for (const option of language.options) {
    const value = stored?.[option.key]
    if (option.kind === 'boolean') {
      resolved[option.key] = typeof value === 'boolean' ? value : option.default
    } else {
      const valid = option.choices.some((choice) => choice.value === value)
      resolved[option.key] = valid && typeof value === 'string' ? value : option.default
    }
  }
  return resolved
}
