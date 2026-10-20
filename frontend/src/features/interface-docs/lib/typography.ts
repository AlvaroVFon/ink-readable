import type { CSSProperties } from 'react'

import { z } from 'zod'

/** Fonts the document can use; the PDF embeds whichever the system resolves. */
export const FONT_FAMILIES = [
  { value: 'geist', label: 'Geist', css: "'Geist Variable', sans-serif" },
  {
    value: 'system',
    label: 'System sans',
    css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  { value: 'serif', label: 'Serif', css: "Georgia, 'Times New Roman', Times, serif" },
  {
    value: 'mono',
    label: 'Monospace',
    css: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  },
] as const

const fontSchema = z.enum(['geist', 'system', 'serif', 'mono'])

export const TYPOGRAPHY_LIMITS = {
  baseSize: { min: 10, max: 22, step: 0.5 },
  codeSize: { min: 70, max: 130, step: 5 },
  lineHeight: { min: 1.2, max: 2.2, step: 0.05 },
  headingScale: { min: 0.8, max: 1.5, step: 0.05 },
} as const

function ranged(limit: { min: number; max: number }, fallback: number) {
  return z.number().min(limit.min).max(limit.max).catch(fallback)
}

export const typographySchema = z.object({
  bodyFont: fontSchema.catch('geist'),
  headingFont: fontSchema.catch('geist'),
  /** Body text size in px. */
  baseSize: ranged(TYPOGRAPHY_LIMITS.baseSize, 15.2),
  /** Code size relative to its default, in percent. */
  codeSize: ranged(TYPOGRAPHY_LIMITS.codeSize, 100),
  lineHeight: ranged(TYPOGRAPHY_LIMITS.lineHeight, 1.75),
  /** Multiplier applied to the default heading sizes. */
  headingScale: ranged(TYPOGRAPHY_LIMITS.headingScale, 1),
})

export type Typography = z.infer<typeof typographySchema>

export const DEFAULT_TYPOGRAPHY: Typography = {
  bodyFont: 'geist',
  headingFont: 'geist',
  baseSize: 15.2,
  codeSize: 100,
  lineHeight: 1.75,
  headingScale: 1,
}

function fontCss(value: Typography['bodyFont']): string {
  return FONT_FAMILIES.find((font) => font.value === value)?.css ?? FONT_FAMILIES[0].css
}

/** CSS variables read by `.markdown-preview`; scoped to the element they are set on. */
export function typographyStyle(typography: Typography): CSSProperties {
  const variables: Record<string, string> = {
    '--doc-font-body': fontCss(typography.bodyFont),
    '--doc-font-heading': fontCss(typography.headingFont),
    '--doc-font-size': `${typography.baseSize}px`,
    '--doc-code-size': String(typography.codeSize / 100),
    '--doc-line-height': String(typography.lineHeight),
    '--doc-heading-scale': String(typography.headingScale),
  }
  // React applies custom properties as-is; `CSSProperties` just doesn't model them.
  return Object.assign({}, variables)
}
