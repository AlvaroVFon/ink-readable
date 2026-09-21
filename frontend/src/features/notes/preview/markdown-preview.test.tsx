import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/components/theme/theme-provider'

import { MarkdownPreview } from './markdown-preview'

const { mermaidInitialize, mermaidRender } = vi.hoisted(() => ({
  mermaidInitialize: vi.fn(),
  mermaidRender: vi.fn(),
}))

vi.mock('mermaid', () => ({
  default: { initialize: mermaidInitialize, render: mermaidRender },
}))

function renderPreview(content: string) {
  return render(
    <ThemeProvider>
      <MarkdownPreview content={content} />
    </ThemeProvider>,
  )
}

describe('MarkdownPreview', () => {
  beforeEach(() => {
    mermaidInitialize.mockReset()
    mermaidRender.mockReset()
    mermaidRender.mockResolvedValue({ svg: '<svg data-testid="diagram"></svg>' })
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders GFM tables and task lists', () => {
    renderPreview('# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done')

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('renders math with KaTeX', async () => {
    renderPreview('$E = mc^2$')

    await waitFor(() => {
      expect(document.querySelector('.katex')).not.toBeNull()
    })
  })

  it('renders mermaid fences as diagrams', async () => {
    renderPreview('```mermaid\ngraph TD; A-->B;\n```')

    await waitFor(() => {
      expect(mermaidRender).toHaveBeenCalled()
    })
    expect(mermaidRender.mock.calls[0]?.[1]).toContain('graph TD')
  })

  it('does not emit raw script tags', () => {
    renderPreview('<script>alert(1)</script>\n\ncontent')

    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
