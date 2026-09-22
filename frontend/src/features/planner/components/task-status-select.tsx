import { Menu } from '@base-ui/react/menu'
import { ChevronDown } from 'lucide-react'

import type { TaskStatus } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { TASK_STATUSES, TASK_STATUS_LABELS } from '../lib/task-order'

const ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'

type TaskStatusSelectProps = {
  value: TaskStatus
  onChange: (status: TaskStatus) => void
  disabled?: boolean
}

/** Dropdown to pick a task status (the kanban column). */
export function TaskStatusSelect({ value, onChange, disabled = false }: TaskStatusSelectProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            className='justify-between'
            disabled={disabled}
            type='button'
            variant='outline'
          />
        }
      >
        <span>{TASK_STATUS_LABELS[value]}</span>
        <ChevronDown
          aria-hidden='true'
          className='ml-auto'
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          align='start'
          className='z-50'
          sideOffset={4}
        >
          <Menu.Popup className='z-50 min-w-[var(--anchor-width)] rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-hidden'>
            {TASK_STATUSES.map((status) => (
              <Menu.Item
                key={status}
                className={cn(ITEM_CLASS, status === value && 'font-medium')}
                onClick={() => {
                  onChange(status)
                }}
              >
                {TASK_STATUS_LABELS[status]}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
