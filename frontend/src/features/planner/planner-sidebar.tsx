import { SquareKanban } from 'lucide-react'

import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar'

export function PlannerSidebar() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className='gap-2'>
        <SquareKanban aria-hidden='true' />
        Projects
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <p className='px-2 py-1 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden'>
          No projects yet.
        </p>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
