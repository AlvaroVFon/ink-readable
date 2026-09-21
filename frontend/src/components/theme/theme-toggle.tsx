import { Monitor, Moon, Sun } from 'lucide-react'

import { useTheme } from '@/components/theme/theme-context'
import { Button } from '@/components/ui/button'
import { THEME_ORDER, type Theme } from '@/lib/theme'

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const

const THEME_LABEL: Record<Theme, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'System theme',
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = THEME_ICON[theme]
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? 'system'

  return (
    <Button
      aria-label={`${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[nextTheme].toLowerCase()}`}
      onClick={() => {
        setTheme(nextTheme)
      }}
      size='icon-sm'
      variant='ghost'
    >
      <Icon aria-hidden='true' />
    </Button>
  )
}
