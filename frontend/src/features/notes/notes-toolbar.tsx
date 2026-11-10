import { ArrowLeftRight, Columns2, Eye, Pencil, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { ExportFormat } from './components/notes-export-menu'
import type { SaveStatus } from './hooks/use-autosave'
import type { ViewMode } from './types'

import { NotesExportMenu } from './components/notes-export-menu'
import { NOTE_ZOOM_MAX, NOTE_ZOOM_MIN, noteZoomLabel } from './lib/note-zoom'

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
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
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
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: NotesToolbarProps) {
  return (
    <div className='flex h-11 shrink-0 items-center gap-3 border-b px-3'>
      <span className='truncate text-sm font-medium'>{title}</span>
      <span
        className={cn('text-xs', SAVE_TONES[status])}
        data-status={status}
        role='status'
      >
        {SAVE_LABELS[status]}
      </span>
      {exportError !== null && (
        <span
          className='text-xs text-destructive'
          role='status'
        >
          {exportError}
        </span>
      )}
      <div
        aria-label='Note zoom'
        className='ml-auto flex items-center gap-0.5'
        role='group'
      >
        <Button
          aria-label='Zoom out'
          disabled={zoom <= NOTE_ZOOM_MIN}
          onClick={onZoomOut}
          size='icon-sm'
          title='Zoom out'
          variant='ghost'
        >
          <ZoomOut aria-hidden='true' />
        </Button>
        <Button
          aria-label='Reset zoom'
          className='min-w-12 text-xs tabular-nums'
          onClick={onZoomReset}
          size='sm'
          title='Reset zoom'
          variant='ghost'
        >
          {noteZoomLabel(zoom)}
        </Button>
        <Button
          aria-label='Zoom in'
          disabled={zoom >= NOTE_ZOOM_MAX}
          onClick={onZoomIn}
          size='icon-sm'
          title='Zoom in'
          variant='ghost'
        >
          <ZoomIn aria-hidden='true' />
        </Button>
      </div>
      {mode === 'split' && (
        <Button
          aria-label='Swap panes'
          aria-pressed={previewFirst}
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
        className='flex items-center gap-1'
        role='group'
      >
        {VIEW_MODES.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            aria-label={label}
            aria-pressed={mode === value}
            onClick={() => {
              onModeChange(value)
            }}
            size='icon-sm'
            variant={mode === value ? 'secondary' : 'ghost'}
          >
            <Icon aria-hidden='true' />
          </Button>
        ))}
      </div>
      <div className='h-4 w-px bg-border' />
      <NotesExportMenu onSelect={onExport} />
    </div>
  )
}
