import { BookOpen, SquareKanban } from 'lucide-react'
import { NavLink } from 'react-router'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const sections = [
  { to: '/', label: 'Notes', icon: BookOpen, end: true },
  { to: '/planner', label: 'Planner', icon: SquareKanban, end: false },
]

export function SectionNav() {
  return (
    <nav
      aria-label='Sections'
      className='flex items-center gap-1'
    >
      {sections.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          end={end}
          to={to}
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              isActive && 'bg-muted text-foreground',
            )
          }
        >
          <Icon aria-hidden='true' />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
