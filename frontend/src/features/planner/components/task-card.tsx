import { Menu } from '@base-ui/react/menu'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { type DragEvent as ReactDragEvent } from 'react'

import type { Task } from '@/lib/types'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MENU_ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'

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
        'group/card relative flex cursor-pointer flex-col gap-1.5 rounded-lg border border-rule/80 bg-sheet p-3 text-left shadow-xs transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-accent-ink/35 hover:shadow-[0_10px_24px_-18px_rgb(0_0_0/0.45)]',
        isDragging && 'rotate-[0.5deg] scale-[1.01] opacity-70 shadow-lg',
      )}
      draggable
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        onDragOverCard(task, event)
      }}
      onDragStart={handleDragStart}
      onDrop={(event) => {
        onDropOnCard(task, event)
      }}
    >
      <button
        aria-label={`Edit ${task.title}`}
        className='flex w-full flex-col gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
        onClick={() => {
          onOpen(task)
        }}
        type='button'
      >
        <p className='pr-7 text-sm leading-snug font-medium break-words'>{task.title}</p>
        {task.description !== '' && (
          <p className='line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap text-graphite'>
            {task.description}
          </p>
        )}
      </button>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Actions for ${task.title}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
            'absolute top-2 right-2 shrink-0 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100',
          )}
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
                onClick={() => {
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
  )
}
