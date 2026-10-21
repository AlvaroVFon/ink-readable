import { EditorConfigPopover } from '@/components/editor-config/editor-config-popover'
import { ThemePicker } from '@/components/theme/theme-picker'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { SectionNav } from './section-nav'

export function AppHeader() {
  return (
    <header className='flex h-12 shrink-0 items-center gap-2 border-b border-rule/70 bg-desk/35 px-3'>
      <SidebarTrigger className='text-graphite hover:text-ink' />
      <span
        aria-hidden='true'
        className='mx-0.5 h-4 w-px bg-rule/80'
      />
      <SectionNav />
      <div className='ml-auto flex items-center gap-1'>
        <EditorConfigPopover />
        <ThemePicker />
      </div>
    </header>
  )
}
