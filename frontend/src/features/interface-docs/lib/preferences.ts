import { z } from 'zod'

import { DEFAULT_TYPOGRAPHY, typographySchema } from './typography'

export const INTERFACE_DOCS_STORAGE_KEY = 'ink-readable-interface-docs'
/** The header image lives apart: a data URL can be large and would block saving the rest. */
export const HEADER_IMAGE_STORAGE_KEY = 'ink-readable-interface-docs-header-image'

const preferencesSchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  version: z.string(),
  locale: z.string(),
  tableOfContents: z.boolean(),
  examples: z.boolean(),
  view: z.enum(['preview', 'markdown']),
  typography: typographySchema.catch(DEFAULT_TYPOGRAPHY),
  headerImageHeight: z.number().min(40).max(400).catch(140),
  headerImageFit: z.enum(['contain', 'cover']).catch('cover'),
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
  typography: DEFAULT_TYPOGRAPHY,
  headerImageHeight: 140,
  headerImageFit: 'cover',
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

export function getStoredHeaderImage(): string | null {
  try {
    return window.localStorage.getItem(HEADER_IMAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeHeaderImage(image: string | null): void {
  try {
    if (image === null) {
      window.localStorage.removeItem(HEADER_IMAGE_STORAGE_KEY)
    } else {
      window.localStorage.setItem(HEADER_IMAGE_STORAGE_KEY, image)
    }
  } catch {
    // Too large for the quota or storage unavailable: the image lasts for this session only.
  }
}
