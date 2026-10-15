import { Menu } from '@base-ui/react/menu'
import { Download, FileText, Printer } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ExportFormat = 'markdown' | 'pdf'

const ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50'

type NotesExportMenuProps = {
  onSelect: (format: ExportFormat) => void
}

/** Toolbar menu to export the open note as Markdown or PDF. */
export function NotesExportMenu({ onSelect }: NotesExportMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label='Export note'
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
      >
        <Download aria-hidden='true' />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          align='end'
          className='z-50'
          sideOffset={6}
        >
          <Menu.Popup className='z-50 min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-hidden'>
            <Menu.Item
              className={ITEM_CLASS}
              onClick={() => {
                onSelect('markdown')
              }}
            >
              <FileText aria-hidden='true' />
              Export as Markdown
            </Menu.Item>
            <Menu.Item
              className={ITEM_CLASS}
              onClick={() => {
                onSelect('pdf')
              }}
            >
              <Printer aria-hidden='true' />
              Export as PDF
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
