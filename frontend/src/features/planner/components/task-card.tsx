import { Menu } from '@base-ui/react/menu'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent } from 'react'

import type { Task } from '@/lib/types'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MENU_ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'

function stopPropagation(event: ReactMouseEvent) {
  event.stopPropagation()
}

type TaskCardProps = {
  task: Task
  isDragging: boolean
  onOpen: (task: Task) => void
  onDelete: (task: Task) => void
  onDragStart: (task: Task) => void
  onDragEnd: () => void
  onDragOverCard: (task: Task, event: ReactDragEvent) => void
  onDropOnCard: (task: Task, event: ReactDragEvent) => void
}

/** A single kanban task. Draggable, click to edit, menu to delete. */
export function TaskCard({
  task,
  isDragging,
  onOpen,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropOnCard,
}: TaskCardProps) {
  const handleDragStart = (event: ReactDragEvent) => {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', task.id)
    }
    onDragStart(task)
  }

  return (
    <div
      className={cn(
        'group/card flex cursor-pointer flex-col gap-1 rounded-lg border bg-card p-2.5 text-left shadow-xs transition-colors hover:border-ring/50',
        isDragging && 'opacity-50',
      )}
      draggable
      onClick={() => {
        onOpen(task)
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        onDragOverCard(task, event)
      }}
      onDragStart={handleDragStart}
      onDrop={(event) => {
        onDropOnCard(task, event)
      }}
    >
      <div className='flex items-start justify-between gap-1'>
        <p className='text-sm font-medium break-words'>{task.title}</p>
        <Menu.Root>
          <Menu.Trigger
            aria-label={`Actions for ${task.title}`}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
              'shrink-0 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100',
            )}
            onClick={stopPropagation}
          >
            <MoreHorizontal aria-hidden='true' />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner
              align='end'
              className='z-50'
              sideOffset={4}
            >
              <Menu.Popup className='z-50 min-w-36 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-hidden'>
                <Menu.Item
                  className={cn(MENU_ITEM_CLASS, 'text-destructive')}
                  onClick={(event) => {
                    // Base UI portals bubble React events through the component
                    // tree, so without this the click would reach the card and
                    // open the edit dialog.
                    event.stopPropagation()
                    onDelete(task)
                  }}
                >
                  <Trash2 aria-hidden='true' />
                  Delete
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      {task.description !== '' && (
        <p className='line-clamp-3 text-xs whitespace-pre-wrap text-muted-foreground'>
          {task.description}
        </p>
      )}
    </div>
  )
}
