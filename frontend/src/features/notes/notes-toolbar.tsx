import { ArrowLeftRight, Columns2, Eye, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { ExportFormat } from './components/notes-export-menu'
import type { SaveStatus } from './hooks/use-autosave'
import type { ViewMode } from './types'

import { NotesExportMenu } from './components/notes-export-menu'

const VIEW_MODES = [
  { value: 'edit', label: 'Editor only', icon: Pencil },
  { value: 'split', label: 'Split view', icon: Columns2 },
  { value: 'preview', label: 'Preview only', icon: Eye },
] as const

const SAVE_LABELS: Record<SaveStatus, string> = {
  dirty: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
}

const SAVE_TONES: Record<SaveStatus, string> = {
  dirty: 'text-muted-foreground',
  saving: 'text-muted-foreground',
  saved: 'text-muted-foreground',
  error: 'text-destructive',
}

type NotesToolbarProps = {
  title: string
  status: SaveStatus
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  previewFirst: boolean
  onSwapPanes: () => void
  onExport: (format: ExportFormat) => void
  exportError: string | null
  compact?: boolean
}

export function NotesToolbar({
  title,
  status,
  mode,
  onModeChange,
  previewFirst,
  onSwapPanes,
  onExport,
  exportError,
  compact = false,
}: NotesToolbarProps) {
  const modes = compact ? VIEW_MODES.filter((item) => item.value !== 'split') : VIEW_MODES

  return (
    <div
      className='flex h-12 shrink-0 items-center gap-3 bg-sheet-raised/60 px-4'
      data-app-toolbar
    >
      <h1 className='min-w-0 truncate text-lg font-semibold leading-tight tracking-tight'>
        {title}
      </h1>
      <span
        className={cn('shrink-0 text-xs', SAVE_TONES[status])}
        data-status={status}
        role='status'
      >
        {SAVE_LABELS[status]}
      </span>
      {exportError !== null && (
        <span
          className='shrink-0 text-xs text-destructive'
          role='status'
        >
          {exportError}
        </span>
      )}
      {mode === 'split' && !compact && (
        <Button
          aria-label='Swap panes'
          aria-pressed={previewFirst}
          className='ml-auto'
          onClick={onSwapPanes}
          size='icon-sm'
          title={previewFirst ? 'Editor on the left' : 'Preview on the left'}
          variant='ghost'
        >
          <ArrowLeftRight aria-hidden='true' />
        </Button>
      )}
      <div
        aria-label='View mode'
        className={cn(
          'flex items-center gap-0.5 rounded-md bg-muted p-0.5',
          (mode !== 'split' || compact) && 'ml-auto',
        )}
        role='group'
      >
        {modes.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            aria-label={label}
            aria-pressed={mode === value}
            className={cn('h-6 rounded-[5px] px-2', mode === value && 'bg-sheet text-foreground')}
            onClick={() => {
              onModeChange(value)
            }}
            size='icon-sm'
            title={label}
            variant='ghost'
          >
            <Icon aria-hidden='true' />
          </Button>
        ))}
      </div>
      <NotesExportMenu onSelect={onExport} />
    </div>
  )
}
