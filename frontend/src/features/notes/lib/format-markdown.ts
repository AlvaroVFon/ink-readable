import type { Plugin } from 'prettier'

/**
 * Formats markdown with Prettier, including fenced code blocks.
 *
 * Prettier formats embedded code (```json, ```ts, ...) through the plugin that
 * handles the fence language, so the language plugins are loaded alongside the
 * markdown one. A block that fails to parse (invalid JSON, a partial snippet)
 * is left untouched by Prettier rather than failing the whole format.
 *
 * Prettier is imported dynamically so its (large) bundle is only fetched the
 * first time the user explicitly saves with format-on-save enabled. Formatting
 * failures are the caller's responsibility: it can fall back to the raw content.
 */
export async function formatMarkdown(content: string): Promise<string> {
  const [prettier, ...plugins] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/markdown'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/typescript'),
    import('prettier/plugins/postcss'),
    import('prettier/plugins/yaml'),
    import('prettier/plugins/html'),
    import('prettier/plugins/graphql'),
  ])

  return prettier.format(content, {
    parser: 'markdown',
    plugins: plugins.map((plugin) => plugin.default as Plugin),
  })
}
