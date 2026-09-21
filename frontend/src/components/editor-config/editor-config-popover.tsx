import { Settings2 } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'

import { useEditorConfigContext } from './editor-config-context'

type SettingRowProps = {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingRow({ label, description, checked, disabled, onCheckedChange }: SettingRowProps) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='flex flex-col'>
        <span className='text-sm font-medium'>{label}</span>
        <span className='text-xs text-muted-foreground'>{description}</span>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

/**
 * Settings button shown in the app header. Opens a popover with the persisted
 * editor preferences (`dark_theme` and `vim_motion`).
 */
export function EditorConfigPopover() {
  const { config, isLoading, error, updateDarkTheme, updateVimMotion } = useEditorConfigContext()
  const disabled = config === null || isLoading

  return (
    <Popover>
      <PopoverTrigger
        aria-label='Editor settings'
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      >
        <Settings2 aria-hidden='true' />
      </PopoverTrigger>
      <PopoverContent align='end'>
        <div className='mb-3'>
          <p className='font-heading text-sm font-medium'>Editor settings</p>
          <p className='text-xs text-muted-foreground'>Synced to your account</p>
        </div>
        <div className='flex flex-col gap-3'>
          <SettingRow
            checked={config?.darkTheme ?? false}
            description='Use the dark theme across the app'
            disabled={disabled}
            label='Dark theme'
            onCheckedChange={(checked) => {
              void updateDarkTheme(checked)
            }}
          />
          <SettingRow
            checked={config?.vimMotion ?? false}
            description='Enable vim keybindings in the editor'
            disabled={disabled}
            label='Vim motion'
            onCheckedChange={(checked) => {
              void updateVimMotion(checked)
            }}
          />
        </div>
        {error !== null && (
          <p
            className='mt-3 text-xs text-destructive'
            role='alert'
          >
            {error.message}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
