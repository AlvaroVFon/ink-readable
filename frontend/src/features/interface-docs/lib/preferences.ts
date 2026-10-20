import { z } from 'zod'

export const INTERFACE_DOCS_STORAGE_KEY = 'ink-readable-interface-docs'

const preferencesSchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  version: z.string(),
  locale: z.string(),
  tableOfContents: z.boolean(),
  examples: z.boolean(),
  view: z.enum(['preview', 'markdown']),
})

export type InterfaceDocsPreferences = z.infer<typeof preferencesSchema>

export const DEFAULT_PREFERENCES: InterfaceDocsPreferences = {
  sourceId: 'typescript',
  title: '',
  version: '1.0.0',
  locale: 'en',
  tableOfContents: true,
  examples: true,
  view: 'preview',
}

export function getStoredPreferences(): InterfaceDocsPreferences {
  try {
    const raw = window.localStorage.getItem(INTERFACE_DOCS_STORAGE_KEY)
    if (raw === null) {
      return DEFAULT_PREFERENCES
    }
    const parsed = preferencesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function storePreferences(preferences: InterfaceDocsPreferences): void {
  try {
    window.localStorage.setItem(INTERFACE_DOCS_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // localStorage can be unavailable (private mode); preferences just won't persist.
  }
}
