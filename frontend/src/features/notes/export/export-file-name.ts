const INVALID_CHARS = /[/\\:*?"<>|]/g

/**
 * Builds a safe file name for an exported note: strips characters that are
 * invalid on common file systems and falls back to `Untitled`.
 */
export function toExportFileName(name: string, extension: string): string {
  const base = name.replace(INVALID_CHARS, '').trim()
  return `${base === '' ? 'Untitled' : base}.${extension}`
}
