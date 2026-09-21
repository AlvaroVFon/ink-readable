import { Menu } from '@base-ui/react/menu'
import { Database, FilePlus, FolderPlus, Plus } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type NewAction = 'note' | 'folder' | 'vault'

const ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50'

type NotesNewMenuProps = {
  /** Notes and folders need a scope (a vault or folder) to be created. */
  canCreateScoped: boolean
  onSelect: (action: NewAction) => void
}

/**
 * "+" menu with the three creation entry points. A vault can always be
 * created; notes and folders require an existing vault.
 */
export function NotesNewMenu({ canCreateScoped, onSelect }: NotesNewMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label='Create new'
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
      >
        <Plus aria-hidden='true' />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          align='end'
          sideOffset={6}
        >
          <Menu.Popup className='z-50 min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-hidden'>
            <Menu.Item
              className={ITEM_CLASS}
              disabled={!canCreateScoped}
              onClick={() => {
                onSelect('note')
              }}
            >
              <FilePlus aria-hidden='true' />
              New note
            </Menu.Item>
            <Menu.Item
              className={ITEM_CLASS}
              disabled={!canCreateScoped}
              onClick={() => {
                onSelect('folder')
              }}
            >
              <FolderPlus aria-hidden='true' />
              New folder
            </Menu.Item>
            <Menu.Item
              className={ITEM_CLASS}
              onClick={() => {
                onSelect('vault')
              }}
            >
              <Database aria-hidden='true' />
              New vault
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
