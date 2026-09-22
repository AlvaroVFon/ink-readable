import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyTheme,
  getStoredMode,
  getStoredPalette,
  isPalette,
  isThemeMode,
  MODE_ORDER,
  PALETTE_ORDER,
  resolveTheme,
  storeMode,
  storePalette,
} from './theme'

describe('isThemeMode', () => {
  it('accepts the supported values', () => {
    expect(MODE_ORDER.every((mode) => isThemeMode(mode))).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isThemeMode('catppuccin')).toBe(false)
    expect(isThemeMode(null)).toBe(false)
  })
})

describe('isPalette', () => {
  it('accepts the supported palettes', () => {
    expect(PALETTE_ORDER.every((palette) => isPalette(palette))).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isPalette('system')).toBe(false)
    expect(isPalette(null)).toBe(false)
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

  it('returns explicit modes unchanged', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })
})

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('falls back to the defaults when nothing is stored', () => {
    expect(getStoredMode()).toBe('system')
    expect(getStoredPalette()).toBe('default')
  })

  it('round-trips stored values', () => {
    storeMode('dark')
    storePalette('nord')

    expect(getStoredMode()).toBe('dark')
    expect(getStoredPalette()).toBe('nord')
  })

  it('ignores invalid stored values', () => {
    window.localStorage.setItem('ink-readable-theme', 'catppuccin')
    window.localStorage.setItem('ink-readable-palette', 'neon')

    expect(getStoredMode()).toBe('system')
    expect(getStoredPalette()).toBe('default')
  })
})

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.className = ''
    delete document.documentElement.dataset.palette
    document.documentElement.style.colorScheme = ''
  })

  it('toggles the dark class and exposes the palette', () => {
    applyTheme('dark', 'catppuccin')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.palette).toBe('catppuccin')

    applyTheme('light', 'default')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.palette).toBe('default')
  })
})
