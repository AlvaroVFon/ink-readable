import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'

import { useTheme } from '@/components/theme/theme-context'
import { ThemeProvider } from '@/components/theme/theme-provider'

const { useEditorConfig } = vi.hoisted(() => ({ useEditorConfig: vi.fn() }))

vi.mock('@/hooks/use-editor-config', () => ({ useEditorConfig }))

import { EditorConfigProvider } from './editor-config-context'

function ThemeProbe() {
  const { theme } = useTheme()
  return <span data-testid='theme'>{theme}</span>
}

function configValue(overrides: Partial<UseEditorConfigResult> = {}): UseEditorConfigResult {
  return {
    config: { id: 'default', darkTheme: true, vimMotion: false, formatOnSave: true },
    isLoading: false,
    error: null,
    updateDarkTheme: vi.fn().mockResolvedValue(undefined),
    updateVimMotion: vi.fn().mockResolvedValue(undefined),
    updateFormatOnSave: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
}

function renderProvider(value: UseEditorConfigResult) {
  useEditorConfig.mockReturnValue(value)
  return render(
    <ThemeProvider>
      <EditorConfigProvider>
        <ThemeProbe />
      </EditorConfigProvider>
    </ThemeProvider>,
  )
}

describe('EditorConfigProvider', () => {
  beforeEach(() => {
    useEditorConfig.mockReset()
  })

  it('applies the persisted dark theme', async () => {
    renderProvider(configValue())

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('dark'))
  })

  it('applies the persisted light theme', async () => {
    renderProvider(
      configValue({
        config: { id: 'default', darkTheme: false, vimMotion: false, formatOnSave: true },
      }),
    )

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('light'))
  })
})
