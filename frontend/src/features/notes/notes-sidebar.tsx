import { FileText } from 'lucide-react'

import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar'

export function NotesSidebar() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className='gap-2'>
        <FileText aria-hidden='true' />
        Notes
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <p className='px-2 py-1 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden'>
          No documents yet.
        </p>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
