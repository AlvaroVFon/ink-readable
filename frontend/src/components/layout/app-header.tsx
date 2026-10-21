import { useLocation } from 'react-router'

import { EditorConfigPopover } from '@/components/editor-config/editor-config-popover'
import { ThemePicker } from '@/components/theme/theme-picker'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { SectionNav } from './section-nav'

export function AppHeader() {
  const { pathname } = useLocation()
  const section = pathname.startsWith('/planner')
    ? 'Planner'
    : pathname.startsWith('/tools')
      ? 'Tools'
      : 'Notes'

  return (
    <header
      className='flex h-12 shrink-0 items-center gap-2 px-2 sm:px-3'
      data-app-toolbar
    >
      <SidebarTrigger className='text-muted-foreground hover:text-foreground' />
      <span className='text-sm font-medium min-[900px]:hidden'>{section}</span>
      <div className='hidden min-[900px]:block'>
        <SectionNav />
      </div>
      <div className='ml-auto flex items-center gap-0.5'>
        <EditorConfigPopover />
        <ThemePicker />
      </div>
    </header>
  )
}
