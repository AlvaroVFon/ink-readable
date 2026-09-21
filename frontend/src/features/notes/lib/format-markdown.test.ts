import { describe, expect, it } from 'vitest'

import { formatMarkdown } from './format-markdown'

describe('formatMarkdown', () => {
  it('normalizes markdown with prettier', async () => {
    const formatted = await formatMarkdown('#  Title\n\n\n\n*   item\n\n\nsome    text\n')

    expect(formatted).toBe('# Title\n\n- item\n\nsome text\n')
  })

  it('returns the same content when there is nothing to format', async () => {
    const content = '# Title\n\nBody\n'

    await expect(formatMarkdown(content)).resolves.toBe(content)
  })
})
