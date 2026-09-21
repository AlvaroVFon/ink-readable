import { EditorConfigPopover } from '@/components/editor-config/editor-config-popover'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { SectionNav } from './section-nav'

export function AppHeader() {
  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b px-3'>
      <SidebarTrigger />
      <SectionNav />
      <div className='ml-auto flex items-center gap-1'>
        <EditorConfigPopover />
        <ThemeToggle />
      </div>
    </header>
  )
}
