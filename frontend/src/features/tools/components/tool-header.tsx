import type { ReactNode } from 'react'

type ToolHeaderProps = {
  title: string
  description: string
  /** Page-level actions, aligned with the title. */
  actions?: ReactNode
  /** Compact option controls, shown on a second row. */
  children?: ReactNode
}

/**
 * Shared header for the developer tools: title and purpose first, page actions
 * on the right, and a dedicated row for the options that shape the output.
 */
export function ToolHeader({ title, description, actions, children }: ToolHeaderProps) {
  return (
    <header className='shrink-0 border-b border-rule/70 px-6 py-3.5'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <h1 className='font-heading text-xl font-semibold tracking-tight'>{title}</h1>
          <p className='mt-0.5 text-xs text-graphite'>{description}</p>
        </div>
        {actions !== undefined && (
          <div className='flex shrink-0 items-center gap-1.5'>{actions}</div>
        )}
      </div>
      {children !== undefined && (
        <div className='mt-3 flex flex-wrap items-center gap-x-5 gap-y-2'>{children}</div>
      )}
    </header>
  )
}

/** A labelled control group in a tool header. */
export function ToolField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-center gap-2'>
      <span className='text-xs text-graphite'>{label}</span>
      {children}
    </div>
  )
}
