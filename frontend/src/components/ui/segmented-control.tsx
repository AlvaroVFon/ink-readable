import { cn } from 'cn'

type SegmentedControlProps = {
  label: string
  value: string
  choices: { value: string; label: string }[]
  onChange: (value: string) => void
}

/**
 * A row of toggle buttons where exactly one is pressed.
 *
 * The active choice sits on the sheet tone, so the control reads as a single
 * segmented surface rather than a row of unrelated buttons.
 */
export function SegmentedControl({ label, value, choices, onChange }: SegmentedControlProps) {
  return (
    <div
      aria-label={label}
      className='inline-flex items-center gap-0.5 rounded-md border border-rule/80 bg-desk/50 p-0.5'
      role='group'
    >
      {choices.map((choice) => {
        const active = choice.value === value
        return (
          <button
            key={choice.value}
            aria-pressed={active}
            className={cn(
              'inline-flex h-6 items-center rounded-[min(var(--radius),5px)] px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              active
                ? 'bg-sheet text-ink shadow-[0_1px_0_var(--rule)]'
                : 'text-graphite hover:text-ink',
            )}
            onClick={() => {
              onChange(choice.value)
            }}
            type='button'
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
