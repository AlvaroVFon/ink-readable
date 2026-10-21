import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'

import { useTheme } from '@/components/theme/theme-context'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { MODE_STORAGE_KEY } from '@/lib/theme'

const { useEditorConfig } = vi.hoisted(() => ({ useEditorConfig: vi.fn() }))

vi.mock('@/hooks/use-editor-config', () => ({ useEditorConfig }))

import { EditorConfigProvider } from './editor-config-context'

function ThemeProbe() {
  const { mode } = useTheme()
  return <span data-testid='theme'>{mode}</span>
}

function configValue(overrides: Partial<UseEditorConfigResult> = {}): UseEditorConfigResult {
  return {
    config: {
      id: 'default',
      darkTheme: true,
      vimMotion: false,
      formatOnSave: true,
      relativeLineNumbers: false,
    },
    isLoading: false,
    error: null,
    updateDarkTheme: vi.fn().mockResolvedValue(undefined),
    updateVimMotion: vi.fn().mockResolvedValue(undefined),
    updateFormatOnSave: vi.fn().mockResolvedValue(undefined),
    updateRelativeLineNumbers: vi.fn().mockResolvedValue(undefined),
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
    window.localStorage.clear()
  })

  it('leaves the appearance mode to the theme provider when the saved editor theme is dark', async () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'light')
    renderProvider(configValue())

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('light'))
  })

  it('leaves the appearance mode to the theme provider when the saved editor theme is light', async () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'dark')
    renderProvider(
      configValue({
        config: {
          id: 'default',
          darkTheme: false,
          vimMotion: false,
          formatOnSave: true,
          relativeLineNumbers: false,
        },
      }),
    )

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('dark'))
  })
})
