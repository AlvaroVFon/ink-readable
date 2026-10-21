import { cn } from 'cn'

/** A keyboard key, used for shortcut hints and command surfaces. */
export function Kbd({ className, children, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot='kbd'
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[min(var(--radius),6px)] border border-rule/80 bg-paper/70 px-1 font-sans text-[10px] leading-none font-medium text-graphite',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
