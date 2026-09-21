import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isTheme, resolveTheme, THEME_ORDER } from './theme'

describe('isTheme', () => {
  it('accepts the supported values', () => {
    expect(THEME_ORDER.every((theme) => isTheme(theme))).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isTheme('sepia')).toBe(false)
    expect(isTheme(null)).toBe(false)
  })
})

describe('resolveTheme', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves system to the media query result', () => {
    expect(resolveTheme('system')).toBe('dark')
  })

  it('returns explicit themes unchanged', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })
})
