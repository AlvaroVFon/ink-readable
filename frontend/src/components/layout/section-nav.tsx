import { BookOpen, SquareKanban, Wrench } from 'lucide-react'
import { NavLink } from 'react-router'

import { cn } from '@/lib/utils'

const sections = [
  { to: '/', label: 'Notes', icon: BookOpen, end: true },
  { to: '/planner', label: 'Planner', icon: SquareKanban, end: false },
  { to: '/tools', label: 'Tools', icon: Wrench, end: false },
]

export function SectionNav() {
  return (
    <nav
      aria-label='Sections'
      className='flex h-full items-center gap-0.5'
    >
      {sections.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          end={end}
          to={to}
          className={({ isActive }) =>
            cn(
              'relative inline-flex h-full items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent-ink after:opacity-0 after:transition-opacity focus-visible:ring-2 focus-visible:ring-ring/50',
              isActive ? 'text-ink after:opacity-100' : 'text-graphite hover:text-ink',
            )
          }
        >
          <Icon
            aria-hidden='true'
            className='size-3.5'
          />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
