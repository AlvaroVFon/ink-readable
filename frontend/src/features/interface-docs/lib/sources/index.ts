import type { SourceLanguage } from './types'

import { go } from './go'
import { typescript } from './typescript'

export type { SourceLanguage } from './types'
export { ParseError } from './scanner'

/** Every language contracts can be written in, in picker order. */
export const sourceLanguages: SourceLanguage[] = [typescript, go]

export function getSourceLanguage(id: string): SourceLanguage {
  return sourceLanguages.find((language) => language.id === id) ?? sourceLanguages[0]
}
