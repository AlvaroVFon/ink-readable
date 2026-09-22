export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export type Palette = 'default' | 'nord' | 'catppuccin' | 'tokyo'

export const MODE_STORAGE_KEY = 'ink-readable-theme'
export const PALETTE_STORAGE_KEY = 'ink-readable-palette'

export const MODE_ORDER: readonly ThemeMode[] = ['light', 'dark', 'system']
export const PALETTE_ORDER: readonly Palette[] = ['default', 'nord', 'catppuccin', 'tokyo']

export const PALETTE_LABEL: Record<Palette, string> = {
  default: 'Default',
  nord: 'Nord',
  catppuccin: 'Catppuccin',
  tokyo: 'Tokyo Night',
}

/**
 * Split swatch preview (light on the top-left half, dark on the bottom-right)
 * used by the theme picker so every palette is recognizable at a glance.
 */
export const PALETTE_PREVIEW: Record<Palette, string> = {
  default: 'linear-gradient(135deg, #ffffff 0 50%, #1c1c1c 50% 100%)',
  nord: 'linear-gradient(135deg, #eceff4 0 50%, #2e3440 50% 100%)',
  catppuccin: 'linear-gradient(135deg, #eff1f5 0 50%, #1e1e2e 50% 100%)',
  tokyo: 'linear-gradient(135deg, #d5d6db 0 50%, #1a1b26 50% 100%)',
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function isPalette(value: unknown): value is Palette {
  return PALETTE_ORDER.some((palette) => palette === value)
}

export function getStoredMode(): ThemeMode {
  try {
    const value = window.localStorage.getItem(MODE_STORAGE_KEY)
    return isThemeMode(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

export function storeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // localStorage can be unavailable (private mode); the mode just won't persist.
  }
}

export function getStoredPalette(): Palette {
  try {
    const value = window.localStorage.getItem(PALETTE_STORAGE_KEY)
    return isPalette(value) ? value : 'default'
  } catch {
    return 'default'
  }
}

export function storePalette(palette: Palette): void {
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette)
  } catch {
    // localStorage can be unavailable (private mode); the palette just won't persist.
  }
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode
}

/**
 * Mirrors the active theme onto `<html>`: the `.dark` class flips every shadcn
 * token between light and dark, while `data-palette` swaps the whole color
 * palette (default, nord, catppuccin, tokyo) on top of that.
 */
export function applyTheme(resolved: ResolvedTheme, palette: Palette): void {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.palette = palette
  root.style.colorScheme = resolved
}
