import type { Plugin } from 'prettier'

/**
 * Formats markdown with Prettier.
 *
 * Prettier is imported dynamically so its (large) bundle is only fetched the
 * first time the user explicitly saves with format-on-save enabled. Formatting
 * failures are the caller's responsibility: it can fall back to the raw content.
 */
export async function formatMarkdown(content: string): Promise<string> {
  const [prettier, markdown] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/markdown'),
  ])

  return prettier.format(content, {
    parser: 'markdown',
    plugins: [markdown.default as Plugin],
  })
}
