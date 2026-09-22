import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'

import { useTheme } from '@/components/theme/theme-context'
import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  MODE_ORDER,
  PALETTE_LABEL,
  PALETTE_ORDER,
  PALETTE_PREVIEW,
  type ThemeMode,
} from '@/lib/theme'
import { cn } from '@/lib/utils'

const MODE_ICON: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const MODE_LABEL: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/**
 * Appearance control for the header. Lets the user pick the light/dark/system
 * mode and an independent color palette, both persisted in localStorage.
 */
export function ThemePicker() {
  const { mode, palette, setMode, setPalette } = useTheme()
  const CurrentIcon = MODE_ICON[mode]

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Appearance: ${MODE_LABEL[mode]} mode, ${PALETTE_LABEL[palette]} palette`}
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      >
        <CurrentIcon aria-hidden='true' />
      </PopoverTrigger>
      <PopoverContent
        align='end'
        className='w-64'
      >
        <div className='mb-3'>
          <p className='font-heading text-sm font-medium'>Appearance</p>
          <p className='text-xs text-muted-foreground'>Color mode and palette</p>
        </div>
        <div
          aria-label='Color mode'
          className='grid grid-cols-3 gap-1 rounded-lg bg-muted p-1'
          role='radiogroup'
        >
          {MODE_ORDER.map((value) => {
            const Icon = MODE_ICON[value]
            const active = value === mode
            return (
              <Button
                key={value}
                aria-checked={active}
                className={cn('justify-center', !active && 'text-muted-foreground')}
                onClick={() => {
                  setMode(value)
                }}
                role='radio'
                size='sm'
                variant={active ? 'secondary' : 'ghost'}
              >
                <Icon aria-hidden='true' />
                {MODE_LABEL[value]}
              </Button>
            )
          })}
        </div>
        <div
          aria-label='Color palette'
          className='mt-3 grid grid-cols-2 gap-2'
          role='radiogroup'
        >
          {PALETTE_ORDER.map((value) => {
            const active = value === palette
            return (
              <button
                key={value}
                aria-checked={active}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-muted',
                  active ? 'border-ring ring-2 ring-ring/40' : 'border-border',
                )}
                onClick={() => {
                  setPalette(value)
                }}
                role='radio'
                type='button'
              >
                <span
                  aria-hidden='true'
                  className='size-5 shrink-0 rounded-full border border-black/10'
                  style={{ background: PALETTE_PREVIEW[value] }}
                />
                <span className='truncate'>{PALETTE_LABEL[value]}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
