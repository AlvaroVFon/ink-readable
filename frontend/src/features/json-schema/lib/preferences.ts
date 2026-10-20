import { z } from 'zod'

export const JSON_SCHEMA_STORAGE_KEY = 'ink-readable-json-schema'

const preferencesSchema = z.object({
  /** `json`, or the id of a declaration language (`typescript`, `go`). */
  sourceId: z.string(),
  /** Blank picks the first declaration (or `Root` for a JSON sample). */
  rootName: z.string(),
  draft: z.enum(['2020-12', '07']),
  strict: z.boolean(),
})

export type JsonSchemaPreferences = z.infer<typeof preferencesSchema>

export const DEFAULT_PREFERENCES: JsonSchemaPreferences = {
  sourceId: 'json',
  rootName: '',
  draft: '2020-12',
  strict: false,
}

export function getStoredPreferences(): JsonSchemaPreferences {
  try {
    const raw = window.localStorage.getItem(JSON_SCHEMA_STORAGE_KEY)
    if (raw === null) {
      return DEFAULT_PREFERENCES
    }
    const parsed = preferencesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function storePreferences(preferences: JsonSchemaPreferences): void {
  try {
    window.localStorage.setItem(JSON_SCHEMA_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // localStorage can be unavailable (private mode); preferences just won't persist.
  }
}
