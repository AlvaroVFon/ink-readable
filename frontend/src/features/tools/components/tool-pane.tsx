import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ToolPaneProps = {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Render content directly on the pane (for previews), without the code card. */
  bare?: boolean
}

/**
 * One half of a tool's input/output split: a slim header with the pane name and
 * its actions, then the code surface.
 */
export function ToolPane({ title, actions, children, className, bare = false }: ToolPaneProps) {
  return (
    <section className={cn('flex min-h-0 flex-col bg-paper', className)}>
      <div className='flex h-9 shrink-0 items-center justify-between gap-2 border-b border-rule/70 bg-desk/30 px-4'>
        <h2 className='text-[11px] font-medium text-graphite'>{title}</h2>
        {actions !== undefined && <div className='flex items-center gap-1'>{actions}</div>}
      </div>
      {bare ? (
        <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
      ) : (
        <div className='min-h-0 flex-1 p-3'>
          <div className='flex h-full flex-col overflow-hidden rounded-lg border border-rule/80 bg-background'>
            {children}
          </div>
        </div>
      )}
    </section>
  )
}
