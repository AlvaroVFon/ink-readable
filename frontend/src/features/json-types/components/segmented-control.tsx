import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SegmentedControlProps = {
  label: string
  value: string
  choices: { value: string; label: string }[]
  onChange: (value: string) => void
}

/** A row of toggle buttons where exactly one is pressed. */
export function SegmentedControl({ label, value, choices, onChange }: SegmentedControlProps) {
  return (
    <div
      aria-label={label}
      className='inline-flex rounded-lg border p-0.5'
      role='group'
    >
      {choices.map((choice) => (
        <button
          key={choice.value}
          aria-pressed={choice.value === value}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            choice.value === value && 'bg-muted text-foreground',
          )}
          onClick={() => {
            onChange(choice.value)
          }}
          type='button'
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}
