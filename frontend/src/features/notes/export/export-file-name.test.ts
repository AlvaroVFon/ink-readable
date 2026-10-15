import { describe, expect, it } from 'vitest'

import { toExportFileName } from './export-file-name'

describe('toExportFileName', () => {
  it('appends the extension', () => {
    expect(toExportFileName('Meeting notes', 'md')).toBe('Meeting notes.md')
  })

  it('strips characters that are invalid in file names', () => {
    expect(toExportFileName('a/b\\c:d*e?f"g<h>i|j', 'pdf')).toBe('abcdefghij.pdf')
  })

  it('falls back to Untitled for empty names', () => {
    expect(toExportFileName('  ', 'md')).toBe('Untitled.md')
    expect(toExportFileName('///', 'md')).toBe('Untitled.md')
  })
})
