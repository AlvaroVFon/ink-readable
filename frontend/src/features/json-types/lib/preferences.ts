import { z } from 'zod'

export const JSON_TYPES_STORAGE_KEY = 'ink-readable-json-types'

const preferencesSchema = z.object({
  languageId: z.string(),
  rootName: z.string(),
  /** Options per language id, so switching languages keeps each one's settings. */
  options: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.boolean()]))),
})

export type JsonTypesPreferences = z.infer<typeof preferencesSchema>

export const DEFAULT_PREFERENCES: JsonTypesPreferences = {
  languageId: 'typescript',
  rootName: 'Root',
  options: {},
}

export function getStoredPreferences(): JsonTypesPreferences {
  try {
    const raw = window.localStorage.getItem(JSON_TYPES_STORAGE_KEY)
    if (raw === null) {
      return DEFAULT_PREFERENCES
    }
    const parsed = preferencesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function storePreferences(preferences: JsonTypesPreferences): void {
  try {
    window.localStorage.setItem(JSON_TYPES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // localStorage can be unavailable (private mode); preferences just won't persist.
  }
}
