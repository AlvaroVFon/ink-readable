import { defaultSchema, type Options } from 'rehype-sanitize'

/**
 * MathML tags emitted by KaTeX.
 */
const MATHML_TAGS = [
  'math',
  'semantics',
  'annotation',
  'annotation-xml',
  'mrow',
  'mi',
  'mn',
  'mo',
  'ms',
  'mtext',
  'mspace',
  'msup',
  'msub',
  'msubsup',
  'mfrac',
  'msqrt',
  'mroot',
  'mover',
  'munder',
  'munderover',
  'mtable',
  'mtr',
  'mtd',
  'mstyle',
  'merror',
  'mpadded',
  'mphantom',
  'menclose',
  'mmultiscripts',
  'mprescripts',
  'none',
]

/**
 * SVG tags. Mermaid renders outside this pipeline, but sanitizing keeps any
 * hand-written inline SVG in notes working.
 */
const SVG_TAGS = [
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'marker',
  'use',
  'symbol',
  'title',
  'desc',
]

function append<T>(list: readonly T[] | null | undefined, ...items: T[]): T[] {
  return [...(list ?? []), ...items]
}

/**
 * Rehype sanitize schema extended for the markdown preview.
 *
 * The default schema drops the output of `rehype-katex` (MathML + KaTeX
 * classes) and `rehype-highlight` (hljs classes), so both are allow-listed.
 * Inline `style` is required because KaTeX positions glyphs with it; notes are
 * authored by the signed-in user, so this stays within the trust boundary.
 */
export const markdownSanitizeSchema: Options = {
  ...defaultSchema,
  tagNames: append(defaultSchema.tagNames, ...MATHML_TAGS, ...SVG_TAGS),
  attributes: {
    ...defaultSchema.attributes,
    '*': append(defaultSchema.attributes?.['*'], 'className', 'style', 'ariaHidden'),
    input: append(defaultSchema.attributes?.['input'], ['type', 'checkbox'], 'checked', 'disabled'),
    math: append(defaultSchema.attributes?.['math'], 'xmlns', 'display'),
  },
}
