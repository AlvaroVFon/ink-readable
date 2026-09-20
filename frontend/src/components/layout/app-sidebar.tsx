import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader />
      <SidebarContent />
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
