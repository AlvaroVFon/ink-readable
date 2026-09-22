import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('renders GitHub alerts with a title and icon', () => {
    renderPreview('> [!WARNING]\n> Watch out')

    const alert = document.querySelector('.markdown-alert-warning')
    expect(alert).not.toBeNull()
    expect(alert?.querySelector('.markdown-alert-title')?.textContent).toBe('WARNING')
    expect(alert?.querySelector('svg path')?.getAttribute('d')).toBeTruthy()
    expect(screen.getByText('Watch out')).toBeInTheDocument()
  })

  it.each([
    ['NOTE', 'note'],
    ['TIP', 'tip'],
    ['IMPORTANT', 'important'],
    ['WARNING', 'warning'],
    ['CAUTION', 'caution'],
  ])('maps the %s alert to its variant class', (label, variant) => {
    const { container } = renderPreview(`> [!${label}]\n> body`)

    expect(container.querySelector(`.markdown-alert-${variant}`)).not.toBeNull()
  })

  it('keeps plain blockquotes untouched', () => {
    renderPreview('> just a quote')

    expect(document.querySelector('blockquote')).not.toBeNull()
    expect(document.querySelector('.markdown-alert')).toBeNull()
  })

  it('renders math with KaTeX', async () => {
    renderPreview('$E = mc^2$')

    await waitFor(() => {
      expect(document.querySelector('.katex')).not.toBeNull()
    })
  })

  it('renders a language header that copies the code on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    renderPreview('```go\nfmt.Println("hi")\n```')

    fireEvent.click(screen.getByRole('button', { name: 'Copy go code' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0]?.[0]).toContain('fmt.Println')
    expect(await screen.findByText('Copied!')).toBeInTheDocument()
  })

  it('renders a plain block without a language header', () => {
    renderPreview('```\nplain text\n```')

    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull()
    expect(screen.getByText('plain text')).toBeInTheDocument()
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
