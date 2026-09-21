import { SidebarTrigger } from '@/components/ui/sidebar'

import { SectionNav } from './section-nav'

export function AppHeader() {
  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b px-3'>
      <SidebarTrigger />
      <SectionNav />
    </header>
  )
}
