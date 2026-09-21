import type { ReactNode } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

type AppSidebarProps = {
  children?: ReactNode
}

export function AppSidebar({ children }: AppSidebarProps) {
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader />
      <SidebarContent>{children}</SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
