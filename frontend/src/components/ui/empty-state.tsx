import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  /** Actions or shortcut hints shown under the copy. */
  children?: ReactNode
}

/**
 * Invitation shown when a workspace has nothing open yet.
 *
 * It is intentionally left-aligned like a blank page, not centered like a
 * placeholder card: the eye starts where writing starts.
 */
export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className='flex flex-1 justify-center px-6 pt-[16vh] pb-12'>
      <div className='w-full max-w-md'>
        <h1 className='font-heading text-3xl leading-tight font-semibold tracking-tight text-ink'>
          {title}
        </h1>
        <p className='mt-3 text-sm leading-relaxed text-graphite'>{description}</p>
        {children !== undefined && (
          <div className='mt-6 flex flex-wrap items-center gap-3'>{children}</div>
        )}
      </div>
    </div>
  )
}
