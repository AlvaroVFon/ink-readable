import { BookOpen, SquareKanban, Wrench } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { cn } from '@/lib/utils'

const sections = [
  { to: '/', label: 'Notes', icon: BookOpen },
  { to: '/planner', label: 'Planner', icon: SquareKanban },
  { to: '/tools', label: 'Tools', icon: Wrench },
]

type SectionNavProps = {
  variant?: 'bar' | 'list'
}

export function SectionNav({ variant = 'bar' }: SectionNavProps) {
  const isList = variant === 'list'
  const { pathname } = useLocation()
  const activeFor = (to: string) =>
    to === '/' ? pathname === '/' || pathname.startsWith('/notes') : pathname.startsWith(to)

  return (
    <nav
      aria-label='Sections'
      className={cn('flex', isList ? 'flex-col gap-0.5' : 'items-center gap-0.5')}
    >
      {sections.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          aria-current={activeFor(to) ? 'page' : undefined}
          aria-label={isList ? undefined : label}
          to={to}
          className={cn(
            'relative inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
            isList
              ? 'h-9 w-full justify-start px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              : 'h-8 px-2.5 text-muted-foreground hover:bg-black/5 hover:text-foreground',
            activeFor(to) &&
              (isList
                ? 'bg-sidebar-accent text-sidebar-foreground nav-list-active'
                : 'text-foreground nav-tab-active'),
          )}
        >
          <Icon
            aria-hidden='true'
            className='size-4 shrink-0'
          />
          <span className={isList ? undefined : 'hidden sm:inline'}>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
