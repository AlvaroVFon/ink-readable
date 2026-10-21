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

const SAVE_DOTS: Record<SaveStatus, string> = {
  dirty: 'bg-muted-foreground',
  saving: 'animate-pulse bg-muted-foreground',
  saved: 'bg-accent-ink',
  error: 'bg-destructive',
}

type NotesToolbarProps = {
  title: string
  status: SaveStatus
  wordCount: number
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  previewFirst: boolean
  onSwapPanes: () => void
  onExport: (format: ExportFormat) => void
  exportError: string | null
}

export function NotesToolbar({
  title,
  status,
  wordCount,
  mode,
  onModeChange,
  previewFirst,
  onSwapPanes,
  onExport,
  exportError,
}: NotesToolbarProps) {
  return (
    <div className='flex h-11 shrink-0 items-center gap-3 border-b border-rule/70 px-3.5'>
      <span className='min-w-0 truncate font-heading text-[15px] font-medium tracking-tight'>
        {title}
      </span>
      <span
        className='inline-flex shrink-0 items-center gap-1.5 text-[11px] text-graphite'
        data-status={status}
        role='status'
      >
        <span
          aria-hidden='true'
          className={cn('size-1.5 rounded-full', SAVE_DOTS[status])}
        />
        {SAVE_LABELS[status]}
      </span>
      <span className='hidden shrink-0 text-[11px] text-graphite tabular-nums sm:inline'>
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </span>
      {exportError !== null && (
        <span
          className='truncate text-xs text-destructive'
          role='status'
        >
          {exportError}
        </span>
      )}
      {mode === 'split' && (
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
          'flex items-center gap-0.5 rounded-md border border-rule/80 bg-desk/50 p-0.5',
          mode !== 'split' && 'ml-auto',
        )}
        role='group'
      >
        {VIEW_MODES.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            aria-label={label}
            aria-pressed={mode === value}
            className={cn(
              'rounded-[min(var(--radius),5px)]',
              mode === value && 'bg-sheet text-ink shadow-[0_1px_0_var(--rule)] hover:bg-sheet',
            )}
            onClick={() => {
              onModeChange(value)
            }}
            size='icon-xs'
            variant='ghost'
          >
            <Icon aria-hidden='true' />
          </Button>
        ))}
      </div>
      <span
        aria-hidden='true'
        className='h-4 w-px bg-rule/80'
      />
      <NotesExportMenu onSelect={onExport} />
    </div>
  )
}
