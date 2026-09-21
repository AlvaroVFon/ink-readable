import type { ReactNode } from 'react'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

type AppShellProps = {
  sidebar?: ReactNode
  children: ReactNode
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar>{sidebar}</AppSidebar>
        <SidebarInset>
          <AppHeader />
          <div className='flex flex-1 flex-col overflow-auto'>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
